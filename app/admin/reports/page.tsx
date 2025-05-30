"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { createSupabaseClient } from "@/lib/supabase"

interface ReportWithPost {
  id: number
  post_id: number
  reported_by: string
  reason: string
  additional_info?: string
  status: string
  created_at: string
  post?: {
    id: number
    title: string
    description?: string
    user_id: string
  }
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    try {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          post_id,
          reported_by,
          reason,
          additional_info,
          status,
          created_at,
          posts:post_id (
            id,
            title,
            description,
            user_id
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading reports:', error)
        return
      }

      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function updateReportStatus(reportId: number, status: string) {
    try {
      const supabase = createSupabaseClient()
      
      const { error } = await supabase
        .from('reports')
        .update({ 
          status, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', reportId)

      if (error) {
        console.error('Error updating report:', error)
        return
      }

      // Refresh reports
      loadReports()
    } catch (error) {
      console.error('Error updating report:', error)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'dismissed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Content Reports</h1>
        <p className="text-muted-foreground">
          Review and moderate reported content from the community
        </p>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Report #{report.id}
                  </CardTitle>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Reported Post</h4>
                  {report.post ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{report.post.title}</p>
                      {report.post.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.post.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Post ID: {report.post_id}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Post not found</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Report Details</h4>
                  <p><strong>Reason:</strong> {report.reason}</p>
                  {report.additional_info && (
                    <p className="mt-2">
                      <strong>Additional Info:</strong> {report.additional_info}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Reported on: {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                {report.status === 'pending' && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      size="sm"
                      onClick={() => updateReportStatus(report.id, 'reviewed')}
                    >
                      Mark as Reviewed
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateReportStatus(report.id, 'resolved')}
                    >
                      Resolve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => updateReportStatus(report.id, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 