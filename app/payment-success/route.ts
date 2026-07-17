import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";

export async function GET(request: NextRequest) {
  // Reading the URL
  const { searchParams } = new URL(request.url);
  // getting transaction_id
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

  // verify with Flutterwave
  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      },
    },
  );

  const data = await response.json();

  // Check payment
  if (data.status !== "success" || data.data.status !== "successful") {
    return NextResponse.json({
      success: false,
    });
  }

  const verifiedTxRef = data.data.tx_ref;

  // Searching Firestore
  const snapshot = await db
    .collection("orders")
    .where("orderNumber", "==", verifiedTxRef)
    .get();

  // Checking if nothing was found
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

  // Get the user ID from the order
  const orderData = order.data();

  const userId = orderData.userId;

  console.log("ORDER DATA:", orderData);
  console.log("USER ID:", userId);

  // Updating Firestore
  await order.ref.update({
    status: "paid",

    paymentStatus: "successful",

    transactionId,

    paidAt: new Date(),
  });

  // get the cart subcollection
  const cartSnapshot = await db
    .collection("users")
    .doc(userId)
    .collection("cart")
    .get();

  console.log("CART ITEMS FOUND:", cartSnapshot.size);

  // Delete every cart item
  const batch = db.batch();

  for (const cartDoc of cartSnapshot.docs) {
    console.log("Deleting:", cartDoc.id);
    batch.delete(cartDoc.ref);
  }

  await batch.commit();

  // Redirect
  return NextResponse.redirect("shoppe://payment-success");
}
