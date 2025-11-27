import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export const Card = ({ children, className = '', onClick, hover = false }: CardProps) => {
  const hoverClass = hover ? 'hover:shadow-md hover:scale-[1.01] cursor-pointer' : ''

  return (
    <div
      className={`card p-6 ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
