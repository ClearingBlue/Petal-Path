/**
 * Utility functions for generating images
 */

/**
 * Gets an appropriate image URL based on type and seed
 */
export function getUnsplashImage(
  type: string,
  seed: number,
  width = 400,
  height = 400
): string {
  const seedValue = seed % 1000; // Ensure seed doesn't get too large

  switch (type) {
    case "avatar":
      return `https://placekitten.com/${width}/${height}?image=${seedValue}`;
    case "location": {
      return `https://picsum.photos/seed/location${seedValue}/${width}/${height}`;
    }
    case "post": {
      return `https://picsum.photos/seed/post${seedValue}/${width}/${height}`;
    }
    case "pin": {
      return `https://picsum.photos/seed/pin${seedValue}/${width}/${height}`;
    }
    case "group": {
      return `https://placekitten.com/${width}/${height}?image=${
        seedValue + 10
      }`;
    }
    default:
      return `https://placekitten.com/${width}/${height}?image=${seedValue}`;
  }
}
