import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { getStudentPseudonym, getPseudonymInitials } from './studentPseudonyms';

interface StudentNameContextType {
  revealRealNames: boolean;
  toggleRevealNames: () => void;
  getDisplayName: (studentId: string, firstName: string, lastName: string) => string;
  getDisplayInitials: (studentId: string, firstName: string, lastName: string) => string;
}

const StudentNameContext = createContext<StudentNameContextType | undefined>(undefined);

export function StudentNameProvider({ children }: { children: ReactNode }) {
  const [revealRealNames, setRevealRealNames] = useState(false);

  const toggleRevealNames = useCallback(() => {
    setRevealRealNames(prev => !prev);
  }, []);

  const getDisplayName = useCallback((studentId: string, firstName: string, lastName: string) => {
    if (revealRealNames) {
      return `${firstName} ${lastName}`;
    }
    return getStudentPseudonym(studentId);
  }, [revealRealNames]);

  const getDisplayInitials = useCallback((studentId: string, firstName: string, lastName: string) => {
    if (revealRealNames) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    const pseudonym = getStudentPseudonym(studentId);
    return getPseudonymInitials(pseudonym);
  }, [revealRealNames]);

  return (
    <StudentNameContext.Provider value={{ 
      revealRealNames, 
      toggleRevealNames, 
      getDisplayName, 
      getDisplayInitials 
    }}>
      {children}
    </StudentNameContext.Provider>
  );
}

export function useStudentNames() {
  const context = useContext(StudentNameContext);
  if (context === undefined) {
    throw new Error('useStudentNames must be used within a StudentNameProvider');
  }
  return context;
}
