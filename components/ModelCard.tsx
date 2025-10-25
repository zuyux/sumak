"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Heart, Eye } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MintCardProps {
  mint: {
    id: number
    title: string
    author: string
    price: string
    image: string
    category?: string
    likes?: number
    views?: number
  }
  featured?: boolean
}

export default function MintCard({ mint, featured = false }: MintCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
      }}
    >
      <Link href={`/mint/${mint.id}`}>
        <Card
          className={cn(
            "group overflow-hidden border-gray-800 bg-gray-900/60 backdrop-blur-sm hover:border-gray-700 transition-all duration-300",
            featured ? "p-4" : "p-3",
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative overflow-hidden rounded-lg">
            {/* Mint image/preview */}
            <div
              className={cn(
                "relative overflow-hidden bg-gray-800 flex items-center justify-center",
                featured ? "h-auto" : "h-auto",
              )}
            >
              <Image
                src={mint.image || "/placeholder.svg"}
                alt={mint.title}
                height={400}
                width={400}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-700 rounded-lg",
                  isHovered ? "scale-110" : "scale-100",
                )}
              />

              {/* Category badge */}
              {mint.category && (
                <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-sm text-xs px-2 py-1 rounded-md text-blue-400 border border-gray-800">
                  {mint.category}
                </div>
              )}

              {/* Stats overlay */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-between items-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                )}
              >
                {mint.likes && (
                  <div className="flex items-center text-xs text-gray-300">
                    <Heart className="w-3 h-3 mr-1 text-red-500" />
                    {mint.likes}
                  </div>
                )}
                {mint.views && (
                  <div className="flex items-center text-xs text-gray-300">
                    <Eye className="w-3 h-3 mr-1 text-blue-400" />
                    {mint.views}K
                  </div>
                )}
              </div>
            </div>

            {/* Mint info */}
            <div className={cn("mt-3", featured ? "px-2" : "px-1")}>
              <h3 className={cn("font-bold text-white truncate", featured ? "text-xl" : "text-base")}>{mint.title}</h3>
              <p className="text-gray-400 text-sm mt-1">by {mint.author}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="font-semibold text-blue-400">{mint.price}</p>
                {featured && (
                  <motion.button
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md"
                    whileTap={{ scale: 0.95 }}
                  >
                    View Details
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
