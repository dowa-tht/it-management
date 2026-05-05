'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const WorkingDateContext = createContext()

export function WorkingDateProvider({ children }) {
  const [workingDate, setWorkingDate] = useState(null)

  useEffect(() => {
    // Load from localStorage on mount
    const savedDate = localStorage.getItem('working_date')
    if (savedDate) {
      setWorkingDate(new Date(savedDate))
    } else {
      setWorkingDate(new Date())
    }
  }, [])

  const updateWorkingDate = (date) => {
    setWorkingDate(date)
    localStorage.setItem('working_date', date.toISOString())
  }

  // Helper to get formatted string YYYY-MM-DD
  const getFormattedDate = () => {
    if (!workingDate) return new Date().toISOString().split('T')[0]
    const d = new Date(workingDate)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().split('T')[0]
  }

  return (
    <WorkingDateContext.Provider value={{ workingDate, setWorkingDate: updateWorkingDate, getFormattedDate }}>
      {children}
    </WorkingDateContext.Provider>
  )
}

export const useWorkingDate = () => useContext(WorkingDateContext)
