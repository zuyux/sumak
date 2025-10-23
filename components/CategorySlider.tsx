"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Category {
  id: number
  name: string
  count: number
  icon: string
}

interface CategorySliderProps {
  categories: Category[]
}

export default function CategorySlider({ categories }: CategorySliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScrollability = () => {
    if (!sliderRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    const slider = sliderRef.current
    if (slider) {
      slider.addEventListener("scroll", checkScrollability)
      // Initial check
      checkScrollability()

      return () => {
        slider.removeEventListener("scroll", checkScrollability)
      }
    }
  }, [])

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return

    const scrollAmount = 300
    const currentScroll = sliderRef.current.scrollLeft

    sliderRef.current.scrollTo({
      left: direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      {/* Left scroll button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-900/80 border-gray-700 text-white -ml-4 hidden md:flex"
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Categories slider */}
      <div
        ref={sliderRef}
        className="flex overflow-x-auto scrollbar-hide gap-4 py-4 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            className="flex-shrink-0 cursor-pointer"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3, delay: index * 0.1 } },
            }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-blue-900/30 hover:to-purple-900/30 border border-gray-700/50 rounded-xl p-5 w-[360px] h-[360px] flex flex-col items-center justify-center transition-all duration-300">
              <div className="text-4xl mb-3">{category.icon}</div>
              <h3 className="font-semibold text-lg">{category.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{category.count} models</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Right scroll button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-900/80 border-gray-700 text-white -mr-4 hidden md:flex"
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
