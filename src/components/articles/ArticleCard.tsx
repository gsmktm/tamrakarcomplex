import { Link } from "react-router-dom";
import { Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Article } from "@/hooks/useArticles";
import { SafeImage } from "@/components/common/SafeImage";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

const categoryColorMap: Record<string, string> = {
  mobile: "category-mobile",
  laptop: "category-laptop",
  tablet: "category-tablet",
  audio: "category-audio",
  watch: "category-watch",
  gaming: "category-gaming",
  news: "category-mobile",
  review: "category-laptop",
  comparison: "category-tablet",
  guide: "category-audio",
  price: "category-watch",
};

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  if (featured) {
    return (
      <Link to={`/article/${article.slug}`} className="group">
        <div className="article-card h-full">
          <div className="relative aspect-[16/10] overflow-hidden">
            <SafeImage
              src={article.image || "/placeholder.svg"}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              aspect="video"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className={`category-badge ${categoryColorMap[article.category] || "category-mobile"}`}>
                  {article.category_label || article.category}
                </span>
                {article.read_time ? <span className="text-xs text-white/70">{article.read_time}</span> : null}
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {article.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/article/${article.slug}`} className="group">
      <div className="article-card h-full flex flex-col">
        <div className="relative aspect-video overflow-hidden bg-secondary/25">
          <SafeImage
            src={article.image || "/placeholder.svg"}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            aspect="video"
          />
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <span className={`category-badge ${categoryColorMap[article.category] || "category-mobile"} w-fit mb-2`}>
            {article.category_label || article.category}
          </span>
          <h3 className="font-display font-semibold text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground mt-auto pt-2">
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3" />
              <span className="truncate">{article.author}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
