import { supabase } from "./supabase";

export const uploadImage = async (
  file: File,
  reportId: string,
  imageIndex: number
): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${reportId}/image_${imageIndex}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("report-images")
    .upload(fileName, file);
  console.log("data", data);
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("report-images").getPublicUrl(fileName);

  return publicUrl;
};

export const uploadVoiceNote = async (
  file: File,
  reportId: string
): Promise<string> => {
  const fileName = `${reportId}/voice_note.wav`;

  const { data, error } = await supabase.storage
    .from("voice-notes")
    .upload(fileName, file);
  console.log("data", data);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("voice-notes").getPublicUrl(fileName);

  return publicUrl;
};

export const convertBase64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};
