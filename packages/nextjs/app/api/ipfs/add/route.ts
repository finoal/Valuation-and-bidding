export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = JSON.stringify(body);
    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) {
      throw new Error("PINATA_JWT 未在环境变量中设置");
    }
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONTOIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pinataJWT}`,
      },
      body: data,
    });
    if (!response.ok) {
      throw new Error(`HTTP 错误！状态：${response.status}`);
    }
    const result = await response.json();
    return Response.json({ IpfsHash: result.IpfsHash });
  } catch (error) {
    console.log("Error adding to IPFS", error);
    return Response.json({ error: "Error adding to IPFS" }, { status: 500 });
  }
}
