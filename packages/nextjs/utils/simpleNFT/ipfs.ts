import { create } from "kubo-rpc-client";

const PROJECT_ID = "2GajDLTC6y04qsYsoDRq9nGmWwK";
const PROJECT_SECRET = "48c62c6b3f82d2ecfa2cbe4c90f97037";
const PROJECT_ID_SECRECT = `${PROJECT_ID}:${PROJECT_SECRET}`;

export const ipfsClient = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    Authorization: `Basic ${Buffer.from(PROJECT_ID_SECRECT).toString("base64")}`,
  },
});

export async function getNFTMetadataFromIPFS(ipfsHash: string) {
  for await (const file of ipfsClient.get(ipfsHash)) {
    // The file is of type unit8array so we need to convert it to string
    const content = new TextDecoder().decode(file);
    // Remove any leading/trailing whitespace
    const trimmedContent = content.trim();
    // Find the start and end index of the JSON object
    const startIndex = trimmedContent.indexOf("{");
    const endIndex = trimmedContent.lastIndexOf("}") + 1;
    // Extract the JSON object string
    const jsonObjectString = trimmedContent.slice(startIndex, endIndex);
    try {
      const jsonObject = JSON.parse(jsonObjectString);
      return jsonObject;
    } catch (error) {
      console.log("Error parsing JSON:", error);
      return undefined;
    }
  }
}

// // 将文件转换为 ArrayBuffer
// async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       if (reader.result !== null) {
//         resolve(reader.result as ArrayBuffer);
//       } else {
//         reject(new Error("FileReader result is null"));
//       }
//     };
//     reader.onerror = reject;
//     reader.readAsArrayBuffer(file);
//   });
// }

// // 上传图片到 IPFS 并获取 CID
// export async function uploadImageToIPFS(imageFile: File): Promise<string> {
//   try {
//     // 将图片文件转换为 ArrayBuffer
//     const arrayBuffer = await fileToArrayBuffer(imageFile);

//     // 添加图片文件到 IPFS
//     const added = await ipfsClient.add(arrayBuffer);

//     // 返回 CID
//     return added.cid.toString();
//   } catch (error) {
//     console.error('Error uploading image to IPFS:', error);
//     throw error;
//   }
// }
