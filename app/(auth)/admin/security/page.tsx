/**
 * Admin: User Access, Security & Digital Signatures
 * Provides RBAC controls and PKI status visibility for administrators.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ShieldCheck,
  Shield,
  AlertTriangle,
  FileText,
  PenTool,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type AdminUser = {
  id: string
  name: string
  email: string
  role: 'planner' | 'planning_authority' | 'admin' | string
  status: 'pending' | 'active' | 'suspended' | 'inactive' | string
  created_at?: string | null
  updated_at?: string | null
}

type SystemStatistics = {
  totalUsers: number
  usersByRole: Record<string, number>
  usersByStatus: Record<string, number>
  pendingRegistrations: number
  activeSessions: number
}

type PKIStatus = {
  available: boolean
  provider: string
  error?: string
  queue?: {
    count: number
    oldest?: string
    newest?: string
  }
}

const roleOptions = [
  { value: 'planner', label: 'Planner' },
  { value: 'planning_authority', label: 'Planning Authority' },
  { value: 'admin', label: 'Administrator' },
]

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

export default function AdminSecurityPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: '',
  })
  const [statistics, setStatistics] = useState<SystemStatistics | null>(null)
  const [pkiStatus, setPkiStatus] = useState<PKIStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [queueResult, setQueueResult] = useState<{ processed: number; failed: number } | null>(null)
  const [queueNotification, setQueueNotification] = useState<string | null>(null)
  const [pendingSignatures, setPendingSignatures] = useState<
    Array<{
      id: string
      documentId: string
      documentType: string
      workflowStage: string
      signerName: string
      signerRole: string
      signedAt: string
      documentHash: string
      createdAt: string
    }>
  >([])
  const [loadingSignatures, setLoadingSignatures] = useState(false)
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [manualSignatureData, setManualSignatureData] = useState({
    signerName: '',
    signerRole: '',
    signerId: '',
    witnessName: '',
    witnessId: '',
    notes: '',
  })
  const [applyingSignature, setApplyingSignature] = useState(false)

  const fetchUsers = () => {
    setLoadingUsers(true)
    setError(null)
    const params = new URLSearchParams()
    if (filters.role && filters.role !== 'all') params.append('role', filters.role)
    if (filters.status && filters.status !== 'all') params.append('status', filters.status)
    if (filters.search) params.append('search', filters.search)

    fetch(`/api/admin/users?${params.toString()}`, {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load users')
        }
        setUsers(data.users || [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      })
      .finally(() => setLoadingUsers(false))
  }

  const fetchStatistics = () => {
    fetch('/api/admin/statistics', {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load statistics')
        }
        setStatistics(data.statistics)
      })
      .catch(() => {
        // keep silent
      })
  }

  const fetchPKIStatus = () => {
    fetch('/api/admin/pki/status', {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json()
        if (response.ok && data.success) {
          setPkiStatus(data.status)
        } else {
          setPkiStatus({
            available: false,
            provider: 'unknown',
            error: data.error || 'Unable to reach PKI service',
          })
        }
      })
      .catch(() => {
        setPkiStatus({
          available: false,
          provider: 'manual',
          error: 'PKI service unreachable',
        })
      })
  }

  useEffect(() => {
    fetchUsers()
  }, [filters])

  useEffect(() => {
    fetchStatistics()
    fetchPKIStatus()
    fetchPendingSignatures()
  }, [])

  useEffect(() => {
    // Refresh pending signatures every 30 seconds
    const interval = setInterval(() => {
      fetchPendingSignatures()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdate = async (userId: string, updates: Partial<AdminUser>) => {
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Update failed')
      }
      setSuccess(`Updated ${userId}`)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  async function fetchPendingSignatures() {
    setLoadingSignatures(true)
    try {
      const response = await fetch('/api/admin/signatures/pending', {
        credentials: 'include',
      })
      const data = await response.json()
      if (data.success) {
        setPendingSignatures(data.signatures || [])
      }
    } catch (err) {
      console.error('Failed to fetch pending signatures', err)
    } finally {
      setLoadingSignatures(false)
    }
  }

  async function handleApplyManualSignature(signatureId: string) {
    if (!manualSignatureData.signerName || !manualSignatureData.signerRole || !manualSignatureData.signerId) {
      setError('Signer name, role, and ID are required')
      return
    }

    setApplyingSignature(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/signatures/${signatureId}/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...manualSignatureData,
          signedAt: new Date().toISOString(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Manual signature applied successfully')
        setSelectedSignature(null)
        setManualSignatureData({
          signerName: '',
          signerRole: '',
          signerId: '',
          witnessName: '',
          witnessId: '',
          notes: '',
        })
        await fetchPendingSignatures()
      } else {
        setError(data.error || 'Failed to apply manual signature')
      }
    } catch (err) {
      setError('Failed to apply manual signature')
    } finally {
      setApplyingSignature(false)
    }
  }

  const handleProcessQueue = async () => {
    setQueueResult(null)
    setError(null)
    try {
      const response = await fetch('/api/admin/pki/queue', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process PKI queue')
      }
      setQueueResult({
        processed: data.summary?.processed ?? 0,
        failed: data.summary?.failed ?? 0,
      })
      setSuccess('PKI queue processed')
      setQueueNotification(
        `Processed ${data.summary?.processed ?? 0} items (${data.summary?.failed ?? 0} failed)`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PKI queue')
    }
  }

  const filteredUsers = useMemo(() => users, [users])

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">User Access & PKI</p>
            <h1 className="text-3xl font-bold text-slate-900">User Access, Security & Digital Signatures</h1>
          </div>
          <div className="flex flex-col gap-1 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {pkiStatus?.available ? 'PKI available' : 'PKI offline or manual fallback'}
            </div>
            <div>
              {pkiStatus?.error && (
                <Badge variant="destructive">{pkiStatus.error}</Badge>
              )}
            </div>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card id="system-counts">
          <CardHeader>
            <CardTitle>System counts</CardTitle>
            <CardDescription>Role distribution + sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Total users: {statistics?.totalUsers ?? '—'}</p>
            <p>Active sessions: {statistics?.activeSessions ?? '—'}</p>
            <p>Pending registrations: {statistics?.pendingRegistrations ?? '—'}</p>
            <div className="flex flex-wrap gap-2">
              {statistics &&
                Object.entries(statistics.usersByRole).map(([role, count]) => (
                  <Badge key={role} variant="outline">
                    {role}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card id="digital-signatures">
          <CardHeader>
            <CardTitle>PKI Queue</CardTitle>
            <CardDescription>Fallback signing/enrollment queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Provider: {pkiStatus?.provider ?? '—'}</p>
            <p>Available: {pkiStatus?.available ? 'Yes' : 'No'}</p>
            {pkiStatus?.queue && (
              <p>Queued ops: {pkiStatus.queue.count}</p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleProcessQueue}
              className="mt-2"
            >
              {queueResult
                ? `Queue processed (${queueResult.processed}/${queueResult.failed} failed)`
                : 'Process PKI queue'}
            </Button>
            {queueNotification && (
              <Alert className="mt-2">
                <AlertDescription className="text-xs">{queueNotification}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security posture</CardTitle>
            <CardDescription>Digital signature readiness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-600" />
              <p>Digital signatures from {pkiStatus?.provider || 'PKI service'}</p>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p>Queue items waiting {pkiStatus?.queue?.count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Signatures Section */}
      {pendingSignatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Signatures ({pendingSignatures.length})
            </CardTitle>
            <CardDescription>
              Signatures awaiting manual signing due to PKI unavailability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {pendingSignatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{sig.documentType}</span>
                        <Badge variant="outline">{sig.workflowStage}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Signer: <span className="font-medium">{sig.signerName}</span> ({sig.signerRole})
                        </p>
                        <p>
                          Created: {new Date(sig.createdAt).toLocaleString()}
                        </p>
                        <p className="font-mono text-xs">
                          Hash: {sig.documentHash.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSignature(sig.id)
                            setManualSignatureData({
                              signerName: sig.signerName,
                              signerRole: sig.signerRole,
                              signerId: '',
                              witnessName: '',
                              witnessId: '',
                              notes: '',
                            })
                          }}
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Apply Manual Signature
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Apply Manual Signature</DialogTitle>
                          <DialogDescription>
                            Apply manual signature for document: {sig.documentType} ({sig.workflowStage})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="signer-name">Signer Name *</Label>
                              <Input
                                id="signer-name"
                                value={manualSignatureData.signerName}
                                onChange={(e) =>
                                  setManualSignatureData({
                                    ...manualSignatureData,
                                    signerName: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="signer-role">Signer Role *</Label>
                              <Input
                                id="signer-role"
                                value={manualSignatureData.signerRole}
                                onChange={(e) =>
                                  setManualSignatureData({
                                    ...manualSignatureData,
                                    signerRole: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="signer-id">Signer ID *</Label>
                              <Input
                                id="signer-id"
                                value={manualSignatureData.signerId}
                                onChange={(e) =>
                                  setManualSignatureData({
                                    ...manualSignatureData,
                                    signerId: e.target.value,
                                  })
                                }
                                placeholder="User ID or National ID"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="witness-name">Witness Name (Optional)</Label>
                              <Input
                                id="witness-name"
                                value={manualSignatureData.witnessName}
                                onChange={(e) =>
                                  setManualSignatureData({
                                    ...manualSignatureData,
                                    witnessName: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="witness-id">Witness ID (Optional)</Label>
                              <Input
                                id="witness-id"
                                value={manualSignatureData.witnessId}
                                onChange={(e) =>
                                  setManualSignatureData({
                                    ...manualSignatureData,
                                    witnessId: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="signature-notes">Notes (Optional)</Label>
                            <Textarea
                              id="signature-notes"
                              value={manualSignatureData.notes}
                              onChange={(e) =>
                                setManualSignatureData({
                                  ...manualSignatureData,
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Additional notes about the manual signature..."
                              rows={3}
                            />
                          </div>
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Manual Signature Notice</AlertTitle>
                            <AlertDescription className="text-xs">
                              This signature will be marked as manually applied. Ensure all required
                              information is accurate and that proper authorization exists for manual
                              signing.
                            </AlertDescription>
                          </Alert>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedSignature(null)
                              setManualSignatureData({
                                signerName: '',
                                signerRole: '',
                                signerId: '',
                                witnessName: '',
                                witnessId: '',
                                notes: '',
                              })
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleApplyManualSignature(sig.id)}
                            disabled={applyingSignature || !manualSignatureData.signerName || !manualSignatureData.signerRole || !manualSignatureData.signerId}
                          >
                            {applyingSignature ? 'Applying...' : 'Apply Manual Signature'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card id="user-access">
        <CardHeader>
          <CardTitle>User access controls</CardTitle>
          <CardDescription>Approve planners or assign planning authority roles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Filter by role</Label>
              <Select value={filters.role} onValueChange={(role) => setFilters({ ...filters, role })}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filter by status</Label>
              <Select
                value={filters.status}
                onValueChange={(status) => setFilters({ ...filters, status })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                placeholder="Search by name or email"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[460px]">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-2 font-semibold text-slate-900">{user.name}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleUpdate(user.id, { role: value })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={user.status}
                        onValueChange={(value) => handleUpdate(user.id, { status: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">
                        {user.role === 'planning_authority' ? 'Planner Authority' : user.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdate(user.id, { status: 'active' })}
                      >
                        Approve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

