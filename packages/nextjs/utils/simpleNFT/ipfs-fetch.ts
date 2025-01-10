// import { Token } from "@uniswap/sdk-core";

const fetchFromApi = ({ path, method, body }: { path: string; method: string; body?: object }) =>
  fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then(response => response.json())
    .catch(error => console.error("Error:", error));

export const addToIPFS = (yourJSON: object) => fetchFromApi({ path: "/api/ipfs/add", method: "Post", body: yourJSON });

// export const getMetadataFromIPFS = (ipfsHash: string) =>
//   fetchFromApi({ path: "/api/ipfs/get-metadata", method: "Post", body: { ipfsHash } });
export const getMetadataFromIPFS = async (tokenURI: string) => {
  try {
    console.log(tokenURI);
    const response = await fetch(tokenURI);
    if (!response.ok) {
      throw new Error(`HTTP error! status:${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data from pinata:", error);
    throw error;
  }
};

// // 将文件转换为 ArrayBuffer
// async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onloadend = () => resolve(reader.result as ArrayBuffer);
//     reader.onerror = reject;
//     reader.readAsArrayBuffer(file);
//   });
// }

// 上传图片到 IPFS 并获取 CID
export async function uploadImageToIPFS(imageFile: File): Promise<string> {
  try {
    // 使用 FormData 上传文件
    const formData = new FormData();
    formData.append("file", imageFile);

    // 发送 POST 请求到你的 IPFS 添加接口
    const response = await fetch("/api/ipfs/addimg", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 解析响应体为 JSON 并返回 CID
    const data = await response.json();
    return data.IpfsHash; // 确保你的后端返回的 JSON 对象中有一个 'cid' 属性
  } catch (error) {
    console.error('Error uploading image to IPFS:', error);
    throw error;
  }
}
