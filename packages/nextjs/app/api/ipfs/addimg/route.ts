export async function POST(request: Request) {
  try {
    // 从请求中获取上传的文件（图片）
    const formData = await request.formData();
    const imageFile = formData.get("file"); // 获取上传的文件

    if (!imageFile || !(imageFile instanceof Blob)) {
      throw new Error("未找到上传的图片文件");
    }

    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) {
      throw new Error("PINATA_JWT 未在环境变量中设置");
    }

    // 创建 FormData 来上传图片文件
    const uploadData = new FormData();
    uploadData.append("file", imageFile);

    // 上传文件到 Pinata 的 pinFileToIPFS 接口
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJWT}`, // 使用你的 Pinata JWT
        // 注意：对于文件上传，不要手动设置 Content-Type，它会由浏览器自动生成
      },
      body: uploadData,
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误！状态：${response.status}`);
    }

    const result = await response.json();
    return Response.json({ IpfsHash: result.IpfsHash }); // 返回 IPFS 哈希
  } catch (error) {
    console.error("Error adding image to IPFS", error);
    return Response.json({ error: "Error adding image to IPFS" }, { status: 500 });
  }
}
