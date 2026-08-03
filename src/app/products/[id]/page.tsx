export const runtime = 'edge';
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { PRODUCTS } from "../../../data/mockData";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = PRODUCTS.find((p) => p.id === params.id);
  
  if (!product) {
    return {
      title: "Redirecting... | MARQUE",
      description: "Redirecting to the requested product.",
    };
  }

  return {
    title: `Redirecting to ${product.name} | MARQUE`,
    description: "Redirecting...",
  };
}

const ProductRedirectClient = dynamic(() => import("../../../components/ProductRedirectClient"), { ssr: false });

export default function ProductsRedirectPage({ params }: { params: { id: string } }) {
  return <ProductRedirectClient id={params.id} />;
}
