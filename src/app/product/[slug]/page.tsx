export const runtime = 'edge';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { BRANDS, PRODUCTS } from '../../../data/mockData';
import { supabase } from '../../../utils/supabase';
import { loadSiteConfig } from '../../../utils/siteConfig';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  let product = PRODUCTS.find((p) => p.slug === params.slug);
  
  if (!product) {
    try {
      const { data } = await supabase.from('products').select('*').eq('slug', params.slug).single();
      if (data) {
        product = {
          ...data,
          brandId: data.brand_id || data.brandId,
        } as any;
      }
    } catch (e) {
      // ignore errors
    }
  }
  
  if (!product) {
    return {
      title: "Product Not Found | MARQUE",
      description: "The requested RC model could not be found.",
    };
  }

  // Try to load dynamic brands list
  let dynamicBrands: any[] | null = null;
  try {
    dynamicBrands = await loadSiteConfig<any[]>('brands_list');
  } catch (e) {
    // ignore
  }

  const activeBrands = dynamicBrands && dynamicBrands.length > 0 ? dynamicBrands : BRANDS;
  const brand = activeBrands.find(b => b.id === product?.brandId);
  const brandName = brand ? brand.name : "MARQUE";
  
  const title = `${product.name} - ${brandName} RC Car | MARQUE`;
  const description = product.description ? product.description.substring(0, 160) + "..." : "";
  const imageUrl = product.images && product.images.length > 0 
    ? (product.images[0].startsWith('http') ? product.images[0] : `https://marque.co.in${product.images[0]}`)
    : "";

  return {
    title,
    description,
    openGraph: {
      title: `${product.name} | MARQUE Premium RC`,
      description,
      images: imageUrl ? [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | MARQUE Premium RC`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

const ProductPageClient = dynamic(() => import('../../../components/ProductPageClient'), { ssr: false });

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductPageClient slug={params.slug} />;
}
