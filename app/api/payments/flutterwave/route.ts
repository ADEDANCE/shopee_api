import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();


    // fetch from Flutterwave
    const response = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: body.orderId,
          amount: body.amount,
          currency: "NGN",
          redirect_url: "http://localhost:3000/payment-success",
          customer: {
            email: body.email,
            name: body.name,
          },
          customizations: {
            title: "Shopee",
            description: "Order Payment",
          },
        }),
      }
    );

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
      }
    );
  }
}