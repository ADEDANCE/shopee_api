import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    // Read data sent from Flutter
    const body = await request.json();

    // Make sure transactionId exists
    if (!body.transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // Ask Flutterwave to verify the payment
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${body.transactionId}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify payment with Flutterwave",
        },
        {
          status: 502,
        },
      );
    }

    const flutterwaveData = await response.json();
    console.log(flutterwaveData);

    // Make sure Flutterwave says payment was successful
    if (
      flutterwaveData.status !== "success" ||
      flutterwaveData.data.status !== "successful"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment not successful",
        },
        {
          status: 400,
        },
      );
    }

    // Get order number from Flutterwave
    const orderNumber = flutterwaveData.data.tx_ref;

    // Find the order in Firestore
    const orderQuery = await db
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (orderQuery.empty) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        {
          status: 404,
        },
      );
    }

    const orderDoc = orderQuery.docs[0];
    const orderData = orderDoc.data();

    // Compare amount
    if (flutterwaveData.data.amount !== orderData.total) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount mismatch",
        },
        {
          status: 400,
        },
      );
    }

    // Compare currency
    if (flutterwaveData.data.currency !== "NGN") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid currency",
        },
        {
          status: 400,
        },
      );
    }

    if (orderData.status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Order already verified",
      });
    }

    // Update Firestore
    await orderDoc.ref.update({
      status: "paid",
      transactionId: flutterwaveData.data.id,
      paidAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Verification failed",
      },
      {
        status: 500,
      },
    );
  }
}
