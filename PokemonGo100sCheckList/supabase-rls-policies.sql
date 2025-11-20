-- Enable Row Level Security on SavedUserData table
ALTER TABLE public."SavedUserData" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own data
CREATE POLICY "Users can view their own data"
ON public."SavedUserData"
FOR SELECT
USING (auth.uid() = "userId");

-- Policy: Users can INSERT their own data
CREATE POLICY "Users can insert their own data"
ON public."SavedUserData"
FOR INSERT
WITH CHECK (auth.uid() = "userId");

-- Policy: Users can UPDATE their own data
CREATE POLICY "Users can update their own data"
ON public."SavedUserData"
FOR UPDATE
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- Policy: Users can DELETE their own data
CREATE POLICY "Users can delete their own data"
ON public."SavedUserData"
FOR DELETE
USING (auth.uid() = "userId");

