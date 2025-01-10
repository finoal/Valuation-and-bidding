// route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "~~/utils/db/db";

// 处理 POST 请求来更新 NFT 数据
export async function POST(req: NextRequest) {
  const { data } = await req.json();
  if (!data) {
    return NextResponse.json({ error: "NFT ID and data are required" }, { status: 400 });
  }

  let connection;
  try {
    connection = await connectToDatabase();
    const fields = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(", ");
    const values = Object.values(data);

    await connection.execute(
      `INSERT INTO nfts (${Object.keys(data).join(", ")}) 
       VALUES (${values.map(() => "?").join(", ")})
       ON DUPLICATE KEY UPDATE ${fields}`,
      [...values, ...values],
    );

    return NextResponse.json({ message: "NFT data updated successfully" });
  } catch (error) {
    console.error("Database update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
