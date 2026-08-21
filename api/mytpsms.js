// api/mytpsms.js

import admin from "firebase-admin";

/* =====================================================
   FIREBASE ADMIN INITIALIZATION
===================================================== */

function initializeFirebase() {

  if (admin.apps.length) {
    return admin.app();
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID;

  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL;

  let privateKey =
    process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is missing."
    );
  }

  if (!clientEmail) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL is missing."
    );
  }

  if (!privateKey) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is missing."
    );
  }

  privateKey =
    privateKey.replace(/\\n/g, "\n");

  return admin.initializeApp({
    credential:
      admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
  });

}

initializeFirebase();

const db =
  admin.firestore();

const auth =
  admin.auth();


/* =====================================================
   PRICING
===================================================== */

function roundMoney(value) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    (number + Number.EPSILON) * 100
  ) / 100;

}


/*
 * Your selling-price markup:
 *
 * <= ₦500       → x2
 * ₦500 - ₦999   → x1.5
 * ₦1000+        → x1.3
 */

function calculateSellingPrice(originalPrice) {

  const price =
    Number(originalPrice);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    return 0;
  }

  if (price <= 500) {

    return roundMoney(
      price * 2
    );

  }

  if (price < 1000) {

    return roundMoney(
      price * 1.5
    );

  }

  return roundMoney(
    price * 1.3
  );

}


/* =====================================================
   CORS
===================================================== */

function setCors(res) {

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
   FIREBASE AUTHENTICATION
===================================================== */

async function verifyUser(req) {

  const authorization =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    "";

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {

    const error =
      new Error(
        "Authorization header missing or invalid."
      );

    error.code =
      "AUTH_HEADER_INVALID";

    throw error;

  }


  const token =
    authorization
      .substring(7)
      .trim();


  if (!token) {

    const error =
      new Error(
        "Firebase token is empty."
      );

    error.code =
      "AUTH_TOKEN_MISSING";

    throw error;

  }


  try {

    const decoded =
      await auth.verifyIdToken(
        token,
        false
      );

    console.log(
      "FIREBASE UID:",
      decoded.uid
    );

    return decoded;

  } catch (error) {

    console.error(
      "========== FIREBASE ADMIN ERROR =========="
    );

    console.error(
      "CODE:",
      error?.code
    );

    console.error(
      "MESSAGE:",
      error?.message
    );

    console.error(
      "=========================================="
    );


    const authError =
      new Error(
        `Firebase authentication failed: ${
          error?.code || "unknown"
        }`
      );

    authError.code =
      "AUTH_INVALID";

    throw authError;

  }

}


/* =====================================================
   MYTPSMS REQUEST
===================================================== */

async function mytpRequest(
  endpoint,
  options = {}
) {

  const apiKey =
    process.env.MYTPSMS_API_KEY;

  if (!apiKey) {

    throw new Error(
      "MYTPSMS_API_KEY is not configured."
    );

  }


  const response =
    await fetch(
      `https://mytpsms.com/api/v1/${endpoint}`,
      {

        ...options,

        headers: {

          ...(options.headers || {}),

          "X-API-KEY":
            apiKey

        }

      }
    );


  const raw =
    await response.text();


  let data;


  try {

    data =
      raw
        ? JSON.parse(raw)
        : {};

  } catch {

    console.error(
      "MYTPSMS invalid response:",
      raw
    );

    throw new Error(
      "MYTPSMS returned an invalid response."
    );

  }


  if (!response.ok) {

    throw new Error(
      data?.message ||
      data?.error ||
      `MYTPSMS HTTP ${response.status}`
    );

  }


  return data;

}


/* =====================================================
   USER REFERENCE
===================================================== */

function userRef(uid) {

  return db
    .collection("users")
    .doc(uid);

}


/* =====================================================
   GET USER BALANCE
===================================================== */

async function getUserBalance(uid) {

  const snap =
    await userRef(uid).get();


  if (!snap.exists) {
    return 0;
  }


  const data =
    snap.data() || {};


  const balance =
    Number(
      data.balance || 0
    );


  return Number.isFinite(balance)
    ? roundMoney(balance)
    : 0;

}


/* =====================================================
   DEDUCT WALLET
===================================================== */

async function deductWallet(
  uid,
  amount
) {

  const amountToDeduct =
    roundMoney(amount);


  if (
    !Number.isFinite(amountToDeduct) ||
    amountToDeduct <= 0
  ) {

    throw new Error(
      "Invalid purchase amount."
    );

  }


  const ref =
    userRef(uid);


  let newBalance =
    0;


  await db.runTransaction(
    async transaction => {

      const snap =
        await transaction.get(ref);


      if (!snap.exists) {

        throw new Error(
          "User wallet was not found."
        );

      }


      const data =
        snap.data() || {};


      const balance =
        Number(
          data.balance || 0
        );


      if (
        !Number.isFinite(balance) ||
        balance < amountToDeduct
      ) {

        throw new Error(
          "Insufficient wallet balance."
        );

      }


      newBalance =
        roundMoney(
          balance -
          amountToDeduct
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
   REFUND WALLET
===================================================== */

async function refundWallet(
  uid,
  amount
) {

  const refundAmount =
    roundMoney(amount);


  if (
    !Number.isFinite(refundAmount) ||
    refundAmount <= 0
  ) {

    return;

  }


  const ref =
    userRef(uid);


  let newBalance =
    0;


  await db.runTransaction(
    async transaction => {

      const snap =
        await transaction.get(ref);


      if (!snap.exists) {

        throw new Error(
          "User wallet was not found."
        );

      }


      const data =
        snap.data() || {};


      const balance =
        Number(
          data.balance || 0
        );


      newBalance =
        roundMoney(
          balance +
          refundAmount
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

}) {

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
        Number(
          originalPrice || 0
        ),

      selling_price:
        Number(
          sellingPrice || 0
        ),

      currency:
        currency || "NGN",

      expires_at:
        expiresAt || null,

      status:
        status || "active",

      refunded:
        false,

      created_at:
        admin.firestore.FieldValue.serverTimestamp(),

      updated_at:
        admin.firestore.FieldValue.serverTimestamp()

    });

}


/* =====================================================
   UPDATE ORDER
===================================================== */

async function updateOrder(
  orderId,
  values
) {

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
        merge: true
      }

    );

}


/* =====================================================
   GET PRICE
===================================================== */

async function getSmsPrice({

  provider,
  country,
  service

}) {

  const endpoint =
    `price.php?provider=${encodeURIComponent(
      provider
    )}&country=${encodeURIComponent(
      country
    )}&service=${encodeURIComponent(
      service
    )}`;


  const data =
    await mytpRequest(
      endpoint
    );


  return data;

}


/* =====================================================
   PRICE HANDLER
===================================================== */

async function handlePrice(
  req,
  res,
  user
) {

  const {
    provider,
    country,
    service
  } = req.query || {};


  if (
    !provider ||
    !country ||
    !service
  ) {

    return res.status(400).json({

      success: false,

      message:
        "provider, country and service are required."

    });

  }


  const data =
    await getSmsPrice({

      provider,
      country,
      service

    });


  const originalPrice =
    Number(
      data?.price
    );


  if (
    !Number.isFinite(originalPrice) ||
    originalPrice <= 0
  ) {

    return res.status(502).json({

      success: false,

      message:
        "MYTPSMS returned an invalid price."

    });

  }


  const sellingPrice =
    calculateSellingPrice(
      originalPrice
    );


  const userBalance =
    await getUserBalance(
      user.uid
    );


  const sufficient =
    userBalance >=
    sellingPrice;


  return res.status(200).json({

    success: true,

    price:
      originalPrice,

    selling_price:
      sellingPrice,

    currency:
      data?.currency ||
      "NGN",

    formatted:
      data?.formatted ||
      null,

    selling_formatted:
      `₦${sellingPrice.toFixed(2)}`,

    stock:
      data?.stock ??
      null,

    in_stock:
      data?.in_stock ??
      null,

    pools:
      Array.isArray(data?.pools)
        ? data.pools
        : [],

    balance:
      userBalance,

    sufficient:

      sufficient,

    provider:
      provider,

    country:
      country,

    service:
      service

  });

}


/* =====================================================
   GET HANDLER
===================================================== */

async function handleGet(
  req,
  res,
  user
) {

  const {
    action,
    provider,
    country,
    order_id,
    page
  } = req.query || {};


  /* ===================================================
     BALANCE
  =================================================== */

  if (
    action === "balance"
  ) {

    const balance =
      await getUserBalance(
        user.uid
      );


    return res.status(200).json({

      success: true,

      balance:
        roundMoney(
          balance
        ),

      currency:
        "NGN"

    });

  }


  /* ===================================================
     PRICE
  =================================================== */

  if (
    action === "price"
  ) {

    return handlePrice(
      req,
      res,
      user
    );

  }


  /* ===================================================
     COUNTRIES
  =================================================== */

  if (
    action === "countries"
  ) {

    if (!provider) {

      return res.status(400).json({

        success: false,

        message:
          "provider is required."

      });

    }


    const data =
      await mytpRequest(
        `countries.php?provider=${encodeURIComponent(
          provider
        )}`
      );


    return res.status(200).json(
      data
    );

  }


  /* ===================================================
     SERVICES
  =================================================== */

  if (
    action === "services"
  ) {

    if (
      !provider ||
      !country
    ) {

      return res.status(400).json({

        success: false,

        message:
          "provider and country are required."

      });

    }


    const data =
      await mytpRequest(
        `services.php?provider=${encodeURIComponent(
          provider
        )}&country=${encodeURIComponent(
          country
        )}`
      );


    return res.status(200).json(
      data
    );

  }


  /* ===================================================
     STATUS
  =================================================== */

  if (
    action === "status"
  ) {

    if (!order_id) {

      return res.status(400).json({

        success: false,

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


    if (
      orderSnap.exists &&
      orderSnap.data()?.uid !== user.uid
    ) {

      return res.status(403).json({

        success: false,

        message:
          "You do not have access to this order."

      });

    }


    const data =
      await mytpRequest(
        `status.php?order_id=${encodeURIComponent(
          order_id
        )}`
      );


    const smsCode =
      data?.sms_code ||
      data?.code ||
      data?.otp ||
      "";


    await updateOrder(
      order_id,
      {

        status:
          data?.status ||
          "active",

        sms_code:
          smsCode,

        full_sms:
          data?.full_sms ||
          "",

        number:
          data?.number ||
          ""

      }
    );


    return res.status(200).json({

      success: true,

      order_id:
        String(order_id),

      status:
        data?.status ||
        "",

      sms_code:
        smsCode,

      full_sms:
        data?.full_sms ||
        "",

      number:
        data?.number ||
        "",

      seconds_remaining:
        data?.seconds_remaining ??
        null

    });

  }


  /* ===================================================
     HISTORY
  =================================================== */

  if (
    action === "history"
  ) {

    const requestedPage =
      Math.max(
        1,
        Number(
          page || 1
        )
      );


    return res.status(200).json(

      await mytpRequest(
        `history.php?page=${requestedPage}`
      )

    );

  }


  return res.status(400).json({

    success: false,

    message:
      "Invalid action."

  });

}


/* =====================================================
   POST HANDLER
===================================================== */

async function handlePost(
  req,
  res,
  user
) {

  const body =
    req.body || {};

  const action =
    body.action;


  /* ===================================================
     BUY
  =================================================== */

  if (
    action === "buy"
  ) {

    const {
      provider,
      country,
      service,
      serviceName
    } = body;


    if (
      !provider ||
      !country ||
      !service
    ) {

      return res.status(400).json({

        success: false,

        message:
          "provider, country and service are required."

      });

    }


    /* =================================================
       STEP 1 — GET CURRENT PRICE
    ================================================= */

    const priceData =
      await getSmsPrice({

        provider,
        country,
        service

      });


    const originalPrice =
      Number(
        priceData?.price
      );


    if (
      !Number.isFinite(originalPrice) ||
      originalPrice <= 0
    ) {

      return res.status(502).json({

        success: false,

        message:
          "MYTPSMS returned an invalid purchase price."

      });

    }


    /* =================================================
       STEP 2 — CHECK STOCK
    ================================================= */

    if (
      priceData?.in_stock === false
    ) {

      return res.status(400).json({

        success: false,

        message:
          "This service is currently out of stock."

      });

    }


    /* =================================================
       STEP 3 — CALCULATE SELLING PRICE
    ================================================= */

    const sellingPrice =
      calculateSellingPrice(
        originalPrice
      );


    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice <= 0
    ) {

      return res.status(502).json({

        success: false,

        message:
          "Unable to calculate the selling price."

      });

    }


    /* =================================================
       STEP 4 — CHECK USER BALANCE
    ================================================= */

    const balanceBefore =
      await getUserBalance(
        user.uid
      );


    if (
      balanceBefore <
      sellingPrice
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Insufficient wallet balance. You need ₦${sellingPrice.toFixed(
            2
          )}.`,

        balance:
          balanceBefore,

        required:
          sellingPrice,

        sufficient:
          false

      });

    }


    /* =================================================
       STEP 5 — BUY FROM MYTPSMS
    ================================================= */

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


    if (serviceName) {

      formData.append(
        "service_name",
        String(serviceName)
      );

    }


    let data;


    try {

      data =
        await mytpRequest(
          "buy.php",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/x-www-form-urlencoded"

            },

            body:
              formData.toString()

          }
        );

    } catch (error) {

      console.error(
        "MYTPSMS BUY ERROR:",
        error
      );


      return res.status(502).json({

        success: false,

        message:
          error?.message ||
          "MYTPSMS could not process the purchase."

      });

    }


    /* =================================================
       STEP 6 — PROVIDER PURCHASE FAILED
    ================================================= */

    if (
      !data?.success
    ) {

      return res.status(400).json({

        success: false,

        message:
          data?.message ||
          data?.error ||
          "MYTPSMS could not provide a number."

      });

    }


    /* =================================================
       STEP 7 — VERIFY ORDER ID
    ================================================= */

    const orderId =
      String(
        data.order_id ||
        ""
      );


    if (!orderId) {

      return res.status(502).json({

        success: false,

        message:
          "MYTPSMS did not return an order ID. No wallet amount was deducted."

      });

    }


    /* =================================================
       STEP 8 — DEDUCT USER WALLET
    ================================================= */

    let newBalance;


    try {

      newBalance =
        await deductWallet(
          user.uid,
          sellingPrice
        );

    } catch (walletError) {

      console.error(
        "WALLET DEDUCTION FAILED:",
        walletError
      );


      /*
       * The provider already gave us a number.
       * Try to cancel it if the wallet transaction
       * fails.
       */

      try {

        await mytpRequest(
          `cancel.php?order_id=${encodeURIComponent(
            orderId
          )}`,
          {
            method:
              "POST"
          }
        );

      } catch (cancelError) {

        console.error(
          "PROVIDER ROLLBACK FAILED:",
          cancelError
        );

      }


      return res.status(400).json({

        success: false,

        message:
          walletError?.message ||
          "Unable to charge your wallet. The number purchase was cancelled."

      });

    }


    /* =================================================
       STEP 9 — SAVE ORDER
    ================================================= */

    try {

      await saveSmsOrder({

        uid:
          user.uid,

        orderId,

        provider,

        country,

        service,

        serviceName,

        number:
          data.number ||
          "",

        originalPrice,

        sellingPrice,

        currency:
          data.currency ||
          priceData?.currency ||
          "NGN",

        expiresAt:
          data.expires_at ||
          null,

        status:
          data.status ||
          "active"

      });

    } catch (saveError) {

      console.error(
        "ORDER SAVE FAILED:",
        saveError
      );

      /*
       * Do not automatically refund here because
       * the provider order already exists and the
       * wallet has already been charged.
       *
       * The order can still be recovered by its ID.
       */

    }


    /* =================================================
       STEP 10 — RESPONSE
    ================================================= */

    return res.status(200).json({

      success: true,

      message:
        "Number purchased successfully.",

      order_id:
        orderId,

      number:
        data.number ||
        "",

      original_price:
        originalPrice,

      selling_price:
        sellingPrice,

      price:
        sellingPrice,

      currency:
        data.currency ||
        priceData?.currency ||
        "NGN",

      expires_at:
        data.expires_at ||
        null,

      status:
        data.status ||
        "active",

      balance:
        newBalance

    });

  }


  /* ===================================================
     CANCEL
  =================================================== */

  if (
    action === "cancel"
  ) {

    const {
      order_id
    } = body;


    if (!order_id) {

      return res.status(400).json({

        success: false,

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


    if (!orderSnap.exists) {

      return res.status(404).json({

        success: false,

        message:
          "Order not found."

      });

    }


    const order =
      orderSnap.data();


    if (
      order.uid !==
      user.uid
    ) {

      return res.status(403).json({

        success: false,

        message:
          "You do not have access to this order."

      });

    }


    if (
      order.refunded === true
    ) {

      return res.status(400).json({

        success: false,

        message:
          "This order has already been refunded."

      });

    }


    const providerData =
      await mytpRequest(
        `cancel.php?order_id=${encodeURIComponent(
          order_id
        )}`,
        {
          method:
            "POST"
        }
      );


    const providerStatus =
      String(
        providerData?.status ||
        ""
      ).toLowerCase();


    const providerMessage =
      String(
        providerData?.message ||
        ""
      );


    const cancellationSuccessful =
      providerData?.success === true ||
      [
        "cancelled",
        "canceled",
        "refunded"
      ].includes(
        providerStatus
      ) ||
      /cancel|refund/i.test(
        providerMessage
      );


    if (
      !cancellationSuccessful
    ) {

      return res.status(400).json({

        success: false,

        message:
          providerMessage ||
          "MYTPSMS could not cancel this order."

      });

    }


    let newBalance;


    if (
      Number(
        order.selling_price
      ) > 0
    ) {

      newBalance =
        await refundWallet(
          user.uid,
          Number(
            order.selling_price
          )
        );

    } else {

      newBalance =
        await getUserBalance(
          user.uid
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
            order.selling_price ||
            0
          )

      }
    );


    return res.status(200).json({

      success: true,

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

    success: false,

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
) {

  setCors(res);


  /* ===================================================
     OPTIONS
  =================================================== */

  if (
    req.method === "OPTIONS"
  ) {

    return res
      .status(204)
      .end();

  }


  /* ===================================================
     METHOD
  =================================================== */

  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {

    return res.status(405).json({

      success: false,

      message:
        "Method not allowed."

    });

  }


  try {

    /* =================================================
       AUTHENTICATION
    ================================================= */

    const user =
      await verifyUser(
        req
      );


    /* =================================================
       GET
    ================================================= */

    if (
      req.method === "GET"
    ) {

      return await handleGet(
        req,
        res,
        user
      );

    }


    /* =================================================
       POST
    ================================================= */

    return await handlePost(
      req,
      res,
      user
    );


  } catch (error) {

    console.error(
      "SMS API ERROR:",
      error?.code ||
      "",
      error?.message ||
      error
    );


    /* =================================================
       AUTH ERROR
    ================================================= */

    if (
      error?.code ===
        "AUTH_REQUIRED" ||

      error?.code ===
        "AUTH_HEADER_INVALID" ||

      error?.code ===
        "AUTH_TOKEN_MISSING" ||

      error?.code ===
        "AUTH_TOKEN_INVALID" ||

      error?.code ===
        "AUTH_INVALID" ||

      error?.code ===
        "AUTH_DECODE_FAILED"
    ) {

      return res.status(401).json({

        success: false,

        message:
          error.message

      });

    }


    /* =================================================
       SERVER ERROR
    ================================================= */

    return res.status(500).json({

      success: false,

      message:
        error?.message ||
        "Internal server error."

    });

  }

}
