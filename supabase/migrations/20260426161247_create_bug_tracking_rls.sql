/*
  # Bug Tracking System - RLS Policies

  Enables Row Level Security on all tables and creates restrictive policies.
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE severity_predictions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Project members can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Project owners can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Project members policies
CREATE POLICY "Project members can view membership"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Project owners can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Bugs policies
CREATE POLICY "Project members can view bugs"
  ON bugs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = bugs.project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create bugs"
  ON bugs FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = bugs.project_id
        AND project_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = bugs.project_id
        AND projects.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can update bugs"
  ON bugs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = bugs.project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = bugs.project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can delete bugs"
  ON bugs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = bugs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Bug comments policies
CREATE POLICY "Bug members can view comments"
  ON bug_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bugs
      JOIN project_members ON project_members.project_id = bugs.project_id
      WHERE bugs.id = bug_comments.bug_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM bugs
      JOIN projects ON projects.id = bugs.project_id
      WHERE bugs.id = bug_comments.bug_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Bug members can create comments"
  ON bug_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM bugs
        JOIN project_members ON project_members.project_id = bugs.project_id
        WHERE bugs.id = bug_comments.bug_id
        AND project_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM bugs
        JOIN projects ON projects.id = bugs.project_id
        WHERE bugs.id = bug_comments.bug_id
        AND projects.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Comment authors can update comments"
  ON bug_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Comment authors can delete comments"
  ON bug_comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Severity predictions policies
CREATE POLICY "Project members can view predictions"
  ON severity_predictions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bugs
      JOIN project_members ON project_members.project_id = bugs.project_id
      WHERE bugs.id = severity_predictions.bug_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert predictions"
  ON severity_predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bugs
      JOIN project_members ON project_members.project_id = bugs.project_id
      WHERE bugs.id = severity_predictions.bug_id
      AND project_members.user_id = auth.uid()
    )
  );
