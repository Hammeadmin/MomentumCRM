/*
# Create Intranet Communication System

1. New Tables
   - `intranet_posts` - Main posts table with content, categories, and metadata
   - `intranet_comments` - Comments system for posts
   - `intranet_post_views` - View tracking for analytics
   - `intranet_post_likes` - Like system for engagement

2. Security
   - Enable RLS on all tables
   - Add policies for role-based access control
   - Ensure proper data isolation by organization

3. Features
   - Rich content support with featured images
   - Category-based organization
   - Pinned and urgent posts
   - View tracking and engagement metrics
   - Comment system with moderation
*/

-- Create intranet_posts table
CREATE TABLE IF NOT EXISTS intranet_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  author_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  featured_image_url text,
  category text NOT NULL CHECK (category IN ('Nyheter', 'Meddelanden', 'Utbildning', 'Evenemang')),
  is_pinned boolean DEFAULT false,
  is_published boolean DEFAULT false,
  is_urgent boolean DEFAULT false,
  scheduled_publish_at timestamptz,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create intranet_comments table
CREATE TABLE IF NOT EXISTS intranet_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES intranet_posts(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES intranet_comments(id) ON DELETE CASCADE,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create intranet_post_views table for analytics
CREATE TABLE IF NOT EXISTS intranet_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES intranet_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE(post_id, user_id)
);

-- Create intranet_post_likes table
CREATE TABLE IF NOT EXISTS intranet_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES intranet_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE intranet_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intranet_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intranet_post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE intranet_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intranet_posts
CREATE POLICY "Users can view published posts in their organization"
  ON intranet_posts
  FOR SELECT
  TO authenticated
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = intranet_posts.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all posts in their organization"
  ON intranet_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = intranet_posts.organisation_id
      AND up.id = auth.uid()
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = intranet_posts.organisation_id
      AND up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Authors can manage their own posts"
  ON intranet_posts
  FOR ALL
  TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

-- RLS Policies for intranet_comments
CREATE POLICY "Users can view approved comments on published posts"
  ON intranet_comments
  FOR SELECT
  TO authenticated
  USING (
    is_approved = true AND
    EXISTS (
      SELECT 1 FROM intranet_posts p
      JOIN user_profiles up ON up.organisation_id = p.organisation_id
      WHERE p.id = intranet_comments.post_id
      AND p.is_published = true
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on published posts"
  ON intranet_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM intranet_posts p
      JOIN user_profiles up ON up.organisation_id = p.organisation_id
      WHERE p.id = intranet_comments.post_id
      AND p.is_published = true
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON intranet_comments
  FOR UPDATE
  TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Admins can moderate all comments"
  ON intranet_comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM intranet_posts p
      JOIN user_profiles up ON up.organisation_id = p.organisation_id
      WHERE p.id = intranet_comments.post_id
      AND up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- RLS Policies for intranet_post_views
CREATE POLICY "Users can create views for posts in their organization"
  ON intranet_post_views
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM intranet_posts p
      JOIN user_profiles up ON up.organisation_id = p.organisation_id
      WHERE p.id = intranet_post_views.post_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own post views"
  ON intranet_post_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all post views in their organization"
  ON intranet_post_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM intranet_posts p
      JOIN user_profiles up ON up.organisation_id = p.organisation_id
      WHERE p.id = intranet_post_views.post_id
      AND up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- RLS Policies for intranet_post_likes
CREATE POLICY "Users can manage their own likes"
  ON intranet_post_likes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view likes on posts in their organization"
  ON intranet_post_likes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM intranet_posts p
      JOIN user_profiles up ON up.organisation_id = p.organisation_id
      WHERE p.id = intranet_post_likes.post_id
      AND up.id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_intranet_posts_organisation_id ON intranet_posts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_intranet_posts_category ON intranet_posts(category);
CREATE INDEX IF NOT EXISTS idx_intranet_posts_published ON intranet_posts(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intranet_posts_pinned ON intranet_posts(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intranet_posts_author ON intranet_posts(author_user_id);
CREATE INDEX IF NOT EXISTS idx_intranet_comments_post_id ON intranet_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intranet_post_views_post_id ON intranet_post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_intranet_post_likes_post_id ON intranet_post_likes(post_id);

-- Create function to update post counters
CREATE OR REPLACE FUNCTION update_intranet_post_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'intranet_post_views' THEN
    UPDATE intranet_posts 
    SET view_count = (
      SELECT COUNT(*) FROM intranet_post_views 
      WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'intranet_post_likes' THEN
    UPDATE intranet_posts 
    SET like_count = (
      SELECT COUNT(*) FROM intranet_post_likes 
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
    )
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  ELSIF TG_TABLE_NAME = 'intranet_comments' THEN
    UPDATE intranet_posts 
    SET comment_count = (
      SELECT COUNT(*) FROM intranet_comments 
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
      AND is_approved = true
    )
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update counters
CREATE TRIGGER trigger_update_view_count
  AFTER INSERT ON intranet_post_views
  FOR EACH ROW EXECUTE FUNCTION update_intranet_post_counters();

CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON intranet_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_intranet_post_counters();

CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR UPDATE OR DELETE ON intranet_comments
  FOR EACH ROW EXECUTE FUNCTION update_intranet_post_counters();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_intranet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_update_intranet_posts_updated_at
  BEFORE UPDATE ON intranet_posts
  FOR EACH ROW EXECUTE FUNCTION update_intranet_updated_at();

CREATE TRIGGER trigger_update_intranet_comments_updated_at
  BEFORE UPDATE ON intranet_comments
  FOR EACH ROW EXECUTE FUNCTION update_intranet_updated_at();