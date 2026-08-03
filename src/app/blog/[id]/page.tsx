export const runtime = 'edge';
import { Metadata } from 'next';
import { RC_GUIDES } from '../../../data/mockData';
import BlogArticleView from "../../../components/BlogArticleView";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const article = RC_GUIDES.find((g) => g.id === params.id);

  if (!article) {
    return {
      title: "Article Not Found | MARQUE Knowledge Base",
      description: "The requested article could not be found.",
    };
  }

  return {
    title: `${article.title} | MARQUE Blog`,
    description: article.excerpt.substring(0, 160),
    openGraph: {
      title: `${article.title} | MARQUE`,
      description: article.excerpt.substring(0, 160),
      images: [
        {
          url: article.imageUrl.startsWith('http') ? article.imageUrl : `https://marque.co.in${article.imageUrl}`,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${article.title} | MARQUE`,
      description: article.excerpt.substring(0, 160),
      images: [article.imageUrl.startsWith('http') ? article.imageUrl : `https://marque.co.in${article.imageUrl}`],
    },
  };
}

export default function BlogArticlePage() {
  return <BlogArticleView />;
}
