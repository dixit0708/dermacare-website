// Uploads files straight to Cloudinary using an unsigned upload preset.

const CLOUD_NAME = "dqphy1y6o";
const UPLOAD_PRESET = "dpms_unsigned_preset";

export async function uploadCloudinaryMedia(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json();

  if (!data.secure_url) {
    throw new Error(data.error?.message || "Upload failed");
  }

  const resourceType = data.resource_type || (file.type?.startsWith("video/") ? "video" : "image");
  const url = resourceType === "image"
    ? data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/")
    : data.secure_url;

  return { url, resourceType, publicId: data.public_id };
}
