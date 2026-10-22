const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1200;
const MAX_ENCODED_LENGTH = 1.9 * 1024 * 1024;

export class BackgroundImageError extends Error {}

const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new BackgroundImageError("This file isn't a valid image. Please choose another one."));
  image.src = source;
});

const readFile = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new BackgroundImageError("We couldn't read this image. Please try again."));
  reader.readAsDataURL(file);
});

// Downscale and re-encode so the dashboard never loads the full-resolution original.
export async function prepareBackgroundImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new BackgroundImageError('This image format is not supported. Please upload a JPG, PNG, or WebP image.');
  if (file.size > MAX_SOURCE_BYTES) throw new BackgroundImageError('This image is too large. Please choose an image under 10 MB.');
  const image = await loadImage(await readFile(file));
  const scale = Math.min(1, MAX_WIDTH / image.width, MAX_HEIGHT / image.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new BackgroundImageError("We couldn't process this image. Please try another one.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.82, 0.7, 0.55]) {
    const webp = canvas.toDataURL('image/webp', quality);
    const encoded = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
    if (encoded.length <= MAX_ENCODED_LENGTH) return encoded;
  }
  throw new BackgroundImageError('This image is too detailed to use as a background. Please choose a smaller one.');
}
