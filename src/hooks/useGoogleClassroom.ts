import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  ownerId: string;
  courseState: string;
  alternateLink: string;
}

export interface GoogleClassroomStudent {
  courseId: string;
  userId: string;
  profile: {
    id: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    emailAddress?: string;
    photoUrl?: string;
  };
}

export interface GoogleClassroomSubmission {
  courseId: string;
  courseWorkId: string;
  id: string;
  userId: string;
  state: string;
  assignedGrade?: number;
  alternateLink: string;
  courseWorkType: string;
  assignmentSubmission?: {
    attachments?: Array<{
      driveFile?: {
        id: string;
        title: string;
        alternateLink: string;
        thumbnailUrl?: string;
      };
      link?: {
        url: string;
        title?: string;
        thumbnailUrl?: string;
      };
    }>;
  };
}

export function useGoogleClassroom() {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<GoogleClassroomCourse[]>([]);
  const { toast } = useToast();

  const getAccessToken = async (): Promise<string | null> => {
    // First try to get token from current session (best source after fresh OAuth)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.provider_token) {
      return session.provider_token;
    }
    
    // Fall back to stored token if not expired
    const storedToken = localStorage.getItem('google_drive_access_token');
    const storedExpiry = localStorage.getItem('google_drive_token_expiry');
    
    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTime) {
        return storedToken;
      }
    }
    
    return null;
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast({
          title: "Not connected",
          description: "Please sign in with Google Classroom access",
          variant: "destructive",
        });
        return [];
      }

      const response = await fetch(
        'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch courses');
      }

      const data = await response.json();
      const courseList = data.courses || [];
      setCourses(courseList);
      return courseList;
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Failed to fetch courses",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (courseId: string): Promise<GoogleClassroomStudent[]> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return [];

      const response = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/students`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch students');
      }

      const data = await response.json();
      return data.students || [];
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  };

  const fetchCourseWork = async (courseId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return [];

      const response = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch coursework');
      }

      const data = await response.json();
      return data.courseWork || [];
    } catch (error) {
      console.error('Error fetching coursework:', error);
      return [];
    }
  };

  const fetchSubmissions = async (
    courseId: string,
    courseWorkId: string
  ): Promise<GoogleClassroomSubmission[]> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return [];

      const response = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch submissions');
      }

      const data = await response.json();
      return data.studentSubmissions || [];
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }
  };

  const hasClassroomAccess = async (): Promise<boolean> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return false;

    try {
      const response = await fetch(
        'https://classroom.googleapis.com/v1/courses?pageSize=1',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  };

  return {
    loading,
    courses,
    fetchCourses,
    fetchStudents,
    fetchCourseWork,
    fetchSubmissions,
    hasClassroomAccess,
  };
}
