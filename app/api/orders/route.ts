import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body.userId ||
      !body.items ||
      !Array.isArray(body.items) ||
      !body.total
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order data",
        },
        {
          status: 400,
        },
      );
    }

    // create oder number
    const orderNumber = `ORD-${Date.now()}`;

    const orderRef = await db.collection("orders").add({
      orderNumber, 
      userId: body.userId,
      items: body.items,
      total: body.total,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create order",
      },
      {
        status: 500,
      },
    );
  }
}
