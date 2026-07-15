import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const transactionId = searchParams.get("transaction_id");

  const txRef = searchParams.get("tx_ref");

  if (!txRef) {
  return NextResponse.json(
    {
      success: false,
      message: "Missing tx_ref",
    },
    { status: 400 },
  );
}

  if (!transactionId) {
    return NextResponse.json({
      success: false,
      message: "Missing transaction id",
    });
  }

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      },
    },
  );

  const data = await response.json();

  if (data.status !== "success" || data.data.status !== "successful") {
    return NextResponse.json({
      success: false,
    });
  }


  const verifiedTxRef = data.data.tx_ref;
const snapshot = await db
  .collection("orders")
  .where("orderNumber", "==", verifiedTxRef)
  .get();

  


  if (snapshot.empty) {
  return NextResponse.json(
    {
      success: false,
      message: "Order not found",
    },
    { status: 404 },
  );
}


const order = snapshot.docs[0];
  

  await order.ref.update({

    status:"paid",

    paymentStatus:"successful",

    transactionId,

    paidAt:new Date()

});

  return NextResponse.redirect(
    new URL("/success", request.url)
);
}
