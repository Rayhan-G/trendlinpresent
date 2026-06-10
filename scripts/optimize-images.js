import sharp from 'sharp';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

// Optimize all images in your current structure
async function optimizeImages() {
  const images = await glob('assets/images/**/*.{jpg,jpeg,png,gif}', {
    ignore: 'assets/images/optimized/**'
  });
  
  for (const image of images) {
    const dir = path.dirname(image);
    const name = path.basename(image, path.extname(image));
    
    // Create WebP
    await sharp(image)
      .webp({ quality: 80 })
      .toFile(`${dir}/optimized/${name}.webp`);
    
    // Create AVIF (better compression)
    await sharp(image)
      .avif({ quality: 65 })
      .toFile(`${dir}/optimized/${name}.avif`);
      
    console.log(`✅ Optimized: ${image}`);
  }
}

optimizeImages();