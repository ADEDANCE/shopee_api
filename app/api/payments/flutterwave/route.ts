import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const orderDoc = await db.collection("orders").doc(body.orderId).get();

    // Check if the order exists

    if (!orderDoc.exists) {
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

    // extract order data
    const orderData = orderDoc.data()!;

    // fetch from Flutterwave
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
       tx_ref: orderData.orderNumber,
        amount: orderData.total,
        currency: "NGN",
        redirect_url: "https://shopee-api-three.vercel.app/payment-success",
        customer: {
          email: body.email,
          name: body.name,
        },
        customizations: {
          title: "Shopee",
          description: "Order Payment",
        },
      }),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create payment",
      },
      {
        status: 500,
      },
    );
  }
}
