import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ThumbsUp, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Comment {
  id: string;
  name: string;
  date: string;
  text: string;
  likes: number;
  liked: boolean;
  replies: Comment[];
}

const sampleComments: Comment[] = [];

const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
  const [liked, setLiked] = useState(comment.liked);
  const [likes, setLikes] = useState(comment.likes);
  const initials = comment.name.split(" ").map(n => n[0]).join("");

  const handleLike = () => {
    setLiked(!liked);
    setLikes(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <div className={`flex gap-3 ${isReply ? "ml-10 mt-4" : ""}`}>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-sans">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-sans font-semibold text-foreground">{comment.name}</span>
          <span className="text-xs font-sans text-muted-foreground">{comment.date}</span>
        </div>
        <p className="text-sm font-sans text-muted-foreground leading-relaxed">{comment.text}</p>
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handleLike}
            className={`inline-flex items-center gap-1 text-xs font-sans transition-colors ${liked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {likes}
          </button>
          <button className="inline-flex items-center gap-1 text-xs font-sans text-muted-foreground hover:text-primary transition-colors">
            <Reply className="h-3.5 w-3.5" />
            Reply
          </button>
        </div>
        {comment.replies.map(reply => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    </div>
  );
};

export const commentCount = sampleComments.length + sampleComments.reduce((acc, c) => acc + c.replies.length, 0);

const CommentsSection = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Visual mock only – no persistence
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      id="comments"
      className="mt-12 pt-8 border-t border-border"
    >
      <h2 className="text-xl font-serif text-foreground mb-6 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Comments ({commentCount})
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-10 p-5 border border-border rounded-sm bg-card space-y-4">
        <h3 className="text-sm font-sans font-semibold text-foreground">Leave a Comment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            placeholder="Your name *"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="Your email *"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <Textarea
          placeholder="Write your comment…"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          required
        />
        <Button type="submit" size="sm">Post Comment</Button>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {sampleComments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </motion.section>
  );
};

export default CommentsSection;
