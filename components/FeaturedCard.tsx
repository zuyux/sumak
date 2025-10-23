"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Eye, Heart, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeaturedCardProps {
  model: {
    id: number
    title: string
    author: string
    price: string
    image: string
    category?: string
    likes?: number
    views?: number
  }
}

export default function FeaturedCard({ model }: FeaturedCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-purple-900/30 animate-gradient-x"></div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

      {/* Content container */}
      <div
        className="relative w-full h-full flex flex-col justify-center items-center p-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Featured image with animation */}
        <motion.div
          className="relative w-full h-full animate-float"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse-glow"></div>
          <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
            <Image src="/01.png" alt={model.title} height={300} width={300} className="w-full h-full object-cover" />

            {/* Overlay on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center text-sm text-gray-300">
                  <Heart className="w-4 h-4 mr-1 text-red-500" />
                  {model.likes || 243}
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <Eye className="w-4 h-4 mr-1 text-blue-400" />
                  {model.views || 1.2}K
                </div>
              </div>

              <Button
                className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 text-white cursor-pointer"
                size="sm"
              >
                View Details <ArrowUpRight className="ml-1 w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
