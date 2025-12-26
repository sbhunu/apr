/**
 * Workflow Events Monitoring Dashboard
 * View and monitor workflow triggers across all modules
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Search, AlertCircle, CheckCircle2, Clock, Filter } from 'lucide-react'

interface WorkflowEvent {
  id: string
  from_module: string
  to_module: string
  entity_id: string
  entity_type: string
  trigger_type: string
  triggered_at: string
  triggered_by: string
  metadata?: Record<string, unknown>
  status: 'pending' | 'processed' | 'failed'
  processed_at?: string
  error?: string
}

export default function WorkflowEventsPage() {
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTriggerType, setFilterTriggerType] = useState<string>('all')
  const [searchEntityId, setSearchEntityId] = useState('')
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [filterStatus, filterTriggerType, showPendingOnly])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (showPendingOnly) {
        params.append('pending', 'true')
      } else if (searchEntityId) {
        params.append('entityId', searchEntityId)
      }

      const response = await fetch(`/api/workflows/events?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        let filteredEvents = data.events || []

        // Apply filters
        if (filterStatus !== 'all') {
          filteredEvents = filteredEvents.filter((e: WorkflowEvent) => e.status === filterStatus)
        }
        if (filterTriggerType !== 'all') {
          filteredEvents = filteredEvents.filter((e: WorkflowEvent) => e.trigger_type === filterTriggerType)
        }

        setEvents(filteredEvents)
      }
    } catch (error) {
      console.error('Failed to load workflow events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Processed
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="default" className="bg-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTriggerTypeLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      planning_approved: 'Planning → Survey',
      survey_sealed: 'Survey → Deeds',
      scheme_registered: 'Scheme → Title Creation',
      title_registered: 'Title → Operations',
    }
    return labels[triggerType] || triggerType
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-ZW', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Workflow Events Monitor</h1>
        <p className="text-muted-foreground mt-2">
          Monitor workflow triggers and handoffs between modules
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trigger-type-filter">Trigger Type</Label>
              <Select value={filterTriggerType} onValueChange={setFilterTriggerType}>
                <SelectTrigger id="trigger-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="planning_approved">Planning → Survey</SelectItem>
                  <SelectItem value="survey_sealed">Survey → Deeds</SelectItem>
                  <SelectItem value="scheme_registered">Scheme → Title</SelectItem>
                  <SelectItem value="title_registered">Title → Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entity-search">Entity ID</Label>
              <Input
                id="entity-search"
                placeholder="Search by entity ID..."
                value={searchEntityId}
                onChange={(e) => setSearchEntityId(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setShowPendingOnly(!showPendingOnly)
                  setSearchEntityId('')
                }}
                variant={showPendingOnly ? 'default' : 'outline'}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showPendingOnly ? 'Show All' : 'Pending Only'}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={loadEvents} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Events</CardTitle>
          <CardDescription>
            {events.length} event{events.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading workflow events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No workflow events found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trigger Type</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered At</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium">
                          {getTriggerTypeLabel(event.trigger_type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.trigger_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {event.from_module} → {event.to_module}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.entity_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {event.entity_id.substring(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(event.triggered_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.processed_at ? formatDate(event.processed_at) : '-'}
                      </TableCell>
                      <TableCell>
                        {event.error ? (
                          <div className="text-sm text-destructive max-w-xs truncate" title={event.error}>
                            {event.error}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Workflow Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{events.filter(e => e.status === 'processed').length}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{events.filter(e => e.status === 'pending').length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{events.filter(e => e.status === 'failed').length}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

