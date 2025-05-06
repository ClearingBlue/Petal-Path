"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import dynamic from "next/dynamic"

// 动态导入创建地图组件，避免SSR问题
const CreateLocationMapWithNoSSR = dynamic(
  () => import("@/components/create-location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-muted rounded-md flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    ),
  }
)

export default function CreateLocationPage() {
  const router = useRouter()
  const [locationCreated, setLocationCreated] = useState(false)

  // 监听位置创建完成后返回上一页
  useEffect(() => {
    if (locationCreated) {
      toast({
        title: "新地点已创建",
        description: "你可以在创建帖子时选择这个地点",
      })
      
      // 返回前一页
      router.back()
    }
  }, [locationCreated, router])

  // 处理位置创建完成
  const handleLocationCreated = (locationName: string) => {
    setLocationCreated(true)
  }

  return (
    <main className="flex min-h-screen flex-col pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href="/create">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">返回</span>
            </Link>
          </Button>
          <span className="text-lg font-semibold">创建新地点</span>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6 max-w-2xl mx-auto w-full">
        <div className="flex items-start gap-2">
          <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-semibold">创建自定义地点</h2>
            <p className="text-muted-foreground">
              在地图上选择位置并输入地点名称。创建后你可以在发帖时选择这个地点。
            </p>
          </div>
        </div>

        <CreateLocationMapWithNoSSR onLocationCreated={handleLocationCreated} />
      </div>
    </main>
  )
} 