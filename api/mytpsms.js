// api/mytpsms.js

import admin from "firebase-admin";


/* =====================================================
   FIREBASE ADMIN INITIALIZATION
===================================================== */

if (!admin.apps.length) {

  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY
      ?.replace(/\\n/g, "\n");

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error(
      "Firebase Admin environment variables are missing."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:
        process.env.FIREBASE_PROJECT_ID,

      clientEmail:
        process.env.FIREBASE_CLIENT_EMAIL,

      privateKey
    })
  });

}

const db =
  admin.firestore();

const auth =
  admin.auth();


/* =====================================================
   PRICING
===================================================== */

function calculateSellingPrice(originalPrice) {

  const price =
    parseFloat(originalPrice);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    return 0;
  }

  if(price <= 500){

    return roundMoney(
      price * 2
    );

  }

  if(price < 1000){

    return roundMoney(
      price * 1.5
    );

  }

  return roundMoney(
    price * 1.3
  );

}


function roundMoney(value){

  return Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

}


/* =====================================================
   CORS
===================================================== */

function setCors(res){

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

}


/* =====================================================
   FIREBASE AUTH
===================================================== */

async function verifyUser(req){

  const header =
    req.headers.authorization ||
    req.headers.Authorization;

  if(!header){

    throw new Error(
      "Authentication required."
    );

  }

  if(
    typeof header !== "string" ||
    !header.startsWith("Bearer ")
  ){

    throw new Error(
      "Invalid authorization header."
    );

  }

  const token =
    header.substring(7).trim();

  if(!token){

    throw new Error(
      "Authentication token missing."
    );

  }

  try{

    return await auth.verifyIdToken(
      token
    );

    }catch(error){

    console.error(
      "========== FIREBASE TOKEN ERROR =========="
    );

    console.error(
      "Error code:",
      error?.code
    );

    console.error(
      "Error message:",
      error?.message
    );

    console.error(
      "Project ID:",
      process.env.FIREBASE_PROJECT_ID
    );

    console.error(
      "=========================================="
    );

    throw new Error(
      `Firebase authentication failed: ${
        error?.code || "unknown"
      }`
    );

  }

}


/* =====================================================
   MYTPSMS REQUEST
===================================================== */

async function mytpRequest(
  endpoint,
  options = {}
){

  const apiKey =
    process.env.MYTPSMS_API_KEY;

  if(!apiKey){

    throw new Error(
      "MYTPSMS API key is not configured."
    );

  }

  const response =
    await fetch(
      `https://mytpsms.com/api/v1/${endpoint}`,
      {
        ...options,

        headers:{
          ...(options.headers || {}),
          "X-API-KEY":apiKey
        }
      }
    );

  const raw =
    await response.text();

  let data;

  try{

    data =
      raw
        ? JSON.parse(raw)
        : {};

  }catch{

    console.error(
      "MYTPSMS INVALID RESPONSE:",
      raw
    );

    throw new Error(
      "MYTPSMS returned an invalid response."
    );

  }

  if(!response.ok){

    throw new Error(
      data?.message ||
      data?.error ||
      `MYTPSMS HTTP ${response.status}`
    );

  }

  return data;

}


/* =====================================================
   FIRESTORE USER
===================================================== */

function userRef(uid){

  return db
    .collection("users")
    .doc(uid);

}


/* =====================================================
   GET WALLET BALANCE
===================================================== */

async function getUserBalance(uid){

  const snap =
    await userRef(uid).get();

  if(!snap.exists){

    return 0;

  }

  const data =
    snap.data() || {};

  return Number(
    data.balance || 0
  );

}


/* =====================================================
   SAVE SMS ORDER
===================================================== */

async function saveSmsOrder({

  uid,
  orderId,
  provider,
  country,
  service,
  serviceName,
  number,
  originalPrice,
  sellingPrice,
  currency,
  expiresAt,
  status

}){

  await db
    .collection("smsOrders")
    .doc(String(orderId))
    .set({

      uid,

      order_id:
        String(orderId),

      provider:
        provider || "",

      country:
        country || "",

      service:
        service || "",

      service_name:
        serviceName || "",

      number:
        number || "",

      original_price:
        Number(originalPrice || 0),

      selling_price:
        Number(sellingPrice || 0),

      currency:
        currency || "NGN",

      expires_at:
        expiresAt || null,

      status:
        status || "active",

      created_at:
        admin.firestore.FieldValue.serverTimestamp(),

      updated_at:
        admin.firestore.FieldValue.serverTimestamp()

    });

}


/* =====================================================
   DEDUCT USER WALLET
===================================================== */

async function deductWallet(
  uid,
  amount
){

  const amountToDeduct =
    roundMoney(amount);

  if(
    !Number.isFinite(amountToDeduct) ||
    amountToDeduct <= 0
  ){

    throw new Error(
      "Invalid purchase amount."
    );

  }

  const ref =
    userRef(uid);

  let newBalance = 0;

  await db.runTransaction(
    async transaction => {

      const snap =
        await transaction.get(ref);

      if(!snap.exists){

        throw new Error(
          "User wallet was not found."
        );

      }

      const data =
        snap.data() || {};

      const balance =
        Number(data.balance || 0);

      if(
        !Number.isFinite(balance) ||
        balance < amountToDeduct
      ){

        throw new Error(
          "Insufficient wallet balance."
        );

      }

      newBalance =
        roundMoney(
          balance - amountToDeduct
        );

      transaction.update(
        ref,
        {
          balance:
            newBalance
        }
      );

    }
  );

  return newBalance;

}


/* =====================================================
   REFUND USER WALLET
===================================================== */

async function refundWallet(
  uid,
  amount
){

  const refundAmount =
    roundMoney(amount);

  if(
    !Number.isFinite(refundAmount) ||
    refundAmount <= 0
  ){

    return;

  }

  const ref =
    userRef(uid);

  let newBalance = 0;

  await db.runTransaction(
    async transaction => {

      const snap =
        await transaction.get(ref);

      if(!snap.exists){

        throw new Error(
          "User wallet was not found."
        );

      }

      const data =
        snap.data() || {};

      const balance =
        Number(data.balance || 0);

      newBalance =
        roundMoney(
          balance + refundAmount
        );

      transaction.update(
        ref,
        {
          balance:
            newBalance
        }
      );

    }
  );

  return newBalance;

}


/* =====================================================
   UPDATE ORDER
===================================================== */

async function updateOrder(
  orderId,
  values
){

  await db
    .collection("smsOrders")
    .doc(String(orderId))
    .set(
      {
        ...values,

        updated_at:
          admin.firestore.FieldValue.serverTimestamp()
      },
      {
        merge:true
      }
    );

}


/* =====================================================
   GET
===================================================== */

async function handleGet(
  req,
  res,
  decodedUser
){

  const {
    action,
    provider,
    country,
    order_id,
    page
  } = req.query;


  /* ================= BALANCE ================= */

  if(action === "balance"){

    const balance =
      await getUserBalance(
        decodedUser.uid
      );

    return res.status(200).json({

      success:true,

      balance:

        roundMoney(balance),

      currency:"NGN"

    });

  }


  /* ================= COUNTRIES ================= */

  if(action === "countries"){

    if(!provider){

      return res.status(400).json({

        success:false,

        message:
          "provider is required."

      });

    }

    const data =
      await mytpRequest(
        `countries.php?provider=${encodeURIComponent(provider)}`
      );

    return res.status(200).json(data);

  }


  /* ================= SERVICES ================= */

  if(action === "services"){

    if(!provider || !country){

      return res.status(400).json({

        success:false,

        message:
          "provider and country are required."

      });

    }

    const data =
      await mytpRequest(
        `services.php?provider=${encodeURIComponent(provider)}&country=${encodeURIComponent(country)}`
      );

    return res.status(200).json(data);

  }


  /* ================= STATUS ================= */

  if(action === "status"){

    if(!order_id){

      return res.status(400).json({

        success:false,

        message:
          "order_id is required."

      });

    }

    const orderRef =
      db
        .collection("smsOrders")
        .doc(String(order_id));

    const orderSnap =
      await orderRef.get();

    if(
      orderSnap.exists &&
      orderSnap.data()?.uid !== decodedUser.uid
    ){

      return res.status(403).json({

        success:false,

        message:
          "You do not have access to this order."

      });

    }

    const data =
      await mytpRequest(
        `status.php?order_id=${encodeURIComponent(order_id)}`
      );

    const status =
      data?.status || "";

    const smsCode =
      data?.sms_code ||
      data?.code ||
      data?.otp ||
      "";

    await updateOrder(
      order_id,
      {
        status:
          status || "active",

        sms_code:
          smsCode || "",

        full_sms:
          data?.full_sms || "",

        number:
          data?.number || ""
      }
    );

    return res.status(200).json({

      success:true,

      order_id:
        String(order_id),

      status:
        status || "",

      sms_code:
        smsCode || "",

      full_sms:
        data?.full_sms || "",

      number:
        data?.number || "",

      seconds_remaining:
        data?.seconds_remaining ??
        null

    });

  }


  /* ================= HISTORY ================= */

  if(action === "history"){

    const requestedPage =
      Math.max(
        1,
        Number(page || 1)
      );

    const data =
      await mytpRequest(
        `history.php?page=${requestedPage}`
      );

    return res.status(200).json(data);

  }


  return res.status(400).json({

    success:false,

    message:
      "Invalid action."

  });

}


/* =====================================================
   POST
===================================================== */

async function handlePost(
  req,
  res,
  decodedUser
){

  const body =
    req.body || {};

  const action =
    body.action;


  /* ================= BUY ================= */

  if(action === "buy"){

    const {
      provider,
      country,
      service,
      serviceName
    } = body;


    if(
      !provider ||
      !country ||
      !service
    ){

      return res.status(400).json({

        success:false,

        message:
          "provider, country and service are required."

      });

    }


    /* ================= CHECK WALLET FIRST ================= */

    const currentBalance =
      await getUserBalance(
        decodedUser.uid
      );


    if(
      !Number.isFinite(currentBalance) ||
      currentBalance <= 0
    ){

      return res.status(400).json({

        success:false,

        message:
          "Your wallet balance is insufficient."

      });

    }


    /* ================= BUY FROM MYTPSMS ================= */

    const formData =
      new URLSearchParams();

    formData.append(
      "provider",
      String(provider)
    );

    formData.append(
      "country",
      String(country)
    );

    formData.append(
      "service",
      String(service)
    );

    if(serviceName){

      formData.append(
        "service_name",
        String(serviceName)
      );

    }


    const data =
      await mytpRequest(
        "buy.php",
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body:
            formData.toString()
        }
      );


    /* ================= PROVIDER FAILURE ================= */

    if(!data?.success){

      return res.status(400).json({

        success:false,

        message:
          data?.message ||
          data?.error ||
          "MYTPSMS could not provide a number."

      });

    }


    /* ================= PRICE ================= */

    const originalPrice =
      Number(
        data.price || 0
      );

    if(
      !Number.isFinite(originalPrice) ||
      originalPrice <= 0
    ){

      /*
       * We do not deduct the customer
       * when MYTPSMS fails to return
       * a valid price.
       */

      return res.status(502).json({

        success:false,

        message:
          "MYTPSMS returned an invalid purchase price."

      });

    }


    const sellingPrice =
      calculateSellingPrice(
        originalPrice
      );


    if(
      !Number.isFinite(sellingPrice) ||
      sellingPrice <= 0
    ){

      return res.status(502).json({

        success:false,

        message:
          "Unable to calculate the selling price."

      });

    }


    /* ================= CHECK BALANCE AGAIN ================= */

    const balanceBefore =
      await getUserBalance(
        decodedUser.uid
      );


    if(
      balanceBefore < sellingPrice
    ){

      /*
       * Customer cannot afford the number.
       * Cancel the MYTPSMS order so their
       * provider wallet is refunded.
       */

      try{

        if(data.order_id){

          await mytpRequest(
            `cancel.php?order_id=${encodeURIComponent(data.order_id)}`,
            {
              method:"POST"
            }
          );

        }

      }catch(cancelError){

        console.error(
          "AUTO CANCEL FAILED:",
          cancelError
        );

      }


      return res.status(400).json({

        success:false,

        message:
          `Insufficient wallet balance. You need ₦${sellingPrice.toFixed(2)}.`

      });

    }


    /* ================= DEDUCT WALLET ================= */

    let newBalance;

    try{

      newBalance =
        await deductWallet(
          decodedUser.uid,
          sellingPrice
        );

    }catch(walletError){

      /*
       * The MYTPSMS number was already
       * purchased. If the wallet transaction
       * cannot be completed, cancel the
       * provider order to prevent a free number.
       */

      console.error(
        "WALLET DEDUCTION FAILED:",
        walletError
      );


      try{

        if(data.order_id){

          await mytpRequest(
            `cancel.php?order_id=${encodeURIComponent(data.order_id)}`,
            {
              method:"POST"
            }
          );

        }

      }catch(cancelError){

        console.error(
          "ROLLBACK CANCEL FAILED:",
          cancelError
        );

      }


      return res.status(400).json({

        success:false,

        message:
          walletError.message ||
          "Unable to charge your wallet."

      });

    }


    /* ================= SAVE ORDER ================= */

    const orderId =
      String(
        data.order_id ||
        ""
      );


    if(!orderId){

      /*
       * Extremely unusual situation:
       * provider says success but did not
       * return an order ID.
       *
       * Refund the customer because we
       * cannot safely track the order.
       */

      try{

        await refundWallet(
          decodedUser.uid,
          sellingPrice
        );

      }catch(refundError){

        console.error(
          "EMERGENCY REFUND FAILED:",
          refundError
        );

      }


      return res.status(502).json({

        success:false,

        message:
          "MYTPSMS did not return an order ID. Your purchase was rolled back."

      });

    }


    await saveSmsOrder({

      uid:
        decodedUser.uid,

      orderId,

      provider,

      country,

      service,

      serviceName,

      number:
        data.number || "",

      originalPrice,

      sellingPrice,

      currency:
        data.currency || "NGN",

      expiresAt:
        data.expires_at || null,

      status:
        data.status || "active"

    });


    /* ================= RESPONSE ================= */

    return res.status(200).json({

      success:true,

      message:
        "Number purchased successfully.",

      order_id:
        orderId,

      number:
        data.number || "",

      original_price:
        originalPrice,

      selling_price:
        sellingPrice,

      price:
        sellingPrice,

      currency:
        data.currency || "NGN",

      expires_at:
        data.expires_at || null,

      status:
        data.status || "active",

      balance:
        newBalance

    });

  }


  /* ================= CANCEL ================= */

  if(action === "cancel"){

    const {
      order_id
    } = body;


    if(!order_id){

      return res.status(400).json({

        success:false,

        message:
          "order_id is required."

      });

    }


    const orderRef =
      db
        .collection("smsOrders")
        .doc(String(order_id));

    const orderSnap =
      await orderRef.get();


    if(!orderSnap.exists){

      return res.status(404).json({

        success:false,

        message:
          "Order not found."

      });

    }


    const order =
      orderSnap.data();


    if(
      order.uid !==
      decodedUser.uid
    ){

      return res.status(403).json({

        success:false,

        message:
          "You do not have access to this order."

      });

    }


    if(
      order.refunded === true
    ){

      return res.status(400).json({

        success:false,

        message:
          "This order has already been refunded."

      });

    }


    const providerData =
      await mytpRequest(
        `cancel.php?order_id=${encodeURIComponent(order_id)}`,
        {
          method:"POST"
        }
      );


    const providerStatus =
      String(
        providerData?.status || ""
      ).toLowerCase();


    const providerMessage =
      String(
        providerData?.message || ""
      );


    /*
     * MYTPSMS cancellation normally returns
     * a successful cancellation/refund state.
     */

    const cancellationSuccessful =
      providerData?.success === true ||
      [
        "cancelled",
        "canceled",
        "refunded"
      ].includes(providerStatus) ||
      /cancel|refund/i.test(
        providerMessage
      );


    if(!cancellationSuccessful){

      return res.status(400).json({

        success:false,

        message:
          providerMessage ||
          "MYTPSMS could not cancel this order.",

        provider:
          providerData

      });

    }


    /* ================= REFUND CUSTOMER ================= */

    let newBalance;

    if(
      Number(order.selling_price) > 0
    ){

      newBalance =
        await refundWallet(
          decodedUser.uid,
          Number(
            order.selling_price
          )
        );

    }else{

      newBalance =
        await getUserBalance(
          decodedUser.uid
        );

    }


    await updateOrder(
      order_id,
      {
        status:
          "refunded",

        refunded:
          true,

        refunded_at:
          admin.firestore.FieldValue.serverTimestamp(),

        refund_amount:
          Number(
            order.selling_price || 0
          )
      }
    );


    return res.status(200).json({

      success:true,

      message:
        "Order cancelled and wallet refunded.",

      order_id:
        String(order_id),

      status:
        "refunded",

      balance:
        newBalance

    });

  }


  return res.status(400).json({

    success:false,

    message:
      "Invalid action."

  });

}


/* =====================================================
   MAIN HANDLER
===================================================== */

export default async function handler(
  req,
  res
){

  setCors(res);


  /* ================= PREFLIGHT ================= */

  if(req.method === "OPTIONS"){

    return res
      .status(204)
      .end();

  }


  /* ================= METHOD ================= */

  if(
    req.method !== "GET" &&
    req.method !== "POST"
  ){

    return res.status(405).json({

      success:false,

      message:
        "Method not allowed."

    });

  }


  try{

    /* ================= AUTH ================= */

    const decodedUser =
      await verifyUser(req);


    /* ================= GET ================= */

    if(req.method === "GET"){

      return await handleGet(
        req,
        res,
        decodedUser
      );

    }


    /* ================= POST ================= */

    return await handlePost(
      req,
      res,
      decodedUser
    );


  }catch(error){

    console.error(
      "SMS API ERROR:",
      error
    );


    const message =
      error?.message ||
      "Internal server error.";


    if(
      message.includes(
        "Authentication"
      ) ||
      message.includes(
        "Invalid or expired"
      ) ||
      message.includes(
        "authorization"
      )
    ){

      return res.status(401).json({

        success:false,

        message

      });

    }


    return res.status(500).json({

      success:false,

      message

    });

  }

}
