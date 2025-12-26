/**
 * PKI Manager
 * High-level PKI service manager with fallback mechanisms
 */

import { EJBCAClient, EJBCAClientConfig } from './ejbca-client'
import {
  CertificateEnrollmentRequest,
  CertificateEnrollmentResponse,
  DocumentSigningRequest,
  DocumentSigningResponse,
  SignatureVerificationRequest,
  SignatureVerificationResponse,
  CertificateRevocationRequest,
  CertificateRevocationResponse,
  PKIServiceStatus,
  PKIProvider,
  ManualSignatureData,
} from './types'
import { logger } from '@/lib/logger'
import { SystemError } from '@/lib/errors/base'

/**
 * PKI Manager configuration
 */
export interface PKIManagerConfig {
  ejbca?: EJBCAClientConfig
  enableFallback?: boolean
  fallbackQueueEnabled?: boolean
}

/**
 * PKI Manager
 * Manages PKI operations with fallback to manual signatures
 */
export class PKIManager {
  private ejbcaClient?: EJBCAClient
  private config: PKIManagerConfig
  private fallbackQueue: Array<{
    type: 'sign' | 'verify' | 'enroll'
    request: unknown
    timestamp: Date
  }> = []

  constructor(config: PKIManagerConfig) {
    this.config = {
      enableFallback: true,
      fallbackQueueEnabled: true,
      ...config,
    }

    if (config.ejbca) {
      this.ejbcaClient = new EJBCAClient(config.ejbca)
    }
  }

  /**
   * Get current PKI provider status
   */
  async getServiceStatus(): Promise<PKIServiceStatus> {
    if (this.ejbcaClient) {
      return await this.ejbcaClient.checkServiceStatus()
    }

    return {
      available: false,
      provider: 'manual',
      error: 'No PKI provider configured',
    }
  }

  /**
   * Enroll certificate
   */
  async enrollCertificate(
    request: CertificateEnrollmentRequest
  ): Promise<CertificateEnrollmentResponse> {
    // Try EJBCA first
    if (this.ejbcaClient) {
      const status = await this.ejbcaClient.checkServiceStatus()
      if (status.available) {
        return await this.ejbcaClient.enrollCertificate(request)
      }

      // Service unavailable - queue if enabled
      if (this.config.fallbackQueueEnabled) {
        this.fallbackQueue.push({
          type: 'enroll',
          request,
          timestamp: new Date(),
        })
        logger.warn('PKI service unavailable, enrollment queued', {
          userId: request.userId,
        })
      }
    }

    // Fallback: Manual certificate setup
    if (this.config.enableFallback) {
      logger.info('Using manual certificate enrollment fallback', {
        userId: request.userId,
      })
      return {
        success: false,
        error: 'PKI service unavailable. Please use manual certificate setup.',
      }
    }

    return {
      success: false,
      error: 'PKI service unavailable and fallback disabled',
    }
  }

  /**
   * Sign document
   */
  async signDocument(
    request: DocumentSigningRequest
  ): Promise<DocumentSigningResponse> {
    // Try EJBCA first
    if (this.ejbcaClient) {
      const status = await this.ejbcaClient.checkServiceStatus()
      if (status.available) {
        return await this.ejbcaClient.signDocument(request)
      }

      // Service unavailable - queue if enabled
      if (this.config.fallbackQueueEnabled) {
        this.fallbackQueue.push({
          type: 'sign',
          request,
          timestamp: new Date(),
        })
        logger.warn('PKI service unavailable, signing queued', {
          documentId: request.documentId,
        })
      }
    }

    // Fallback: Manual signature
    if (this.config.enableFallback) {
      logger.info('Using manual signature fallback', {
        documentId: request.documentId,
        signerId: request.signerId,
      })
      return {
        success: false,
        error: 'PKI service unavailable. Please use manual signature workflow.',
      }
    }

    return {
      success: false,
      error: 'PKI service unavailable and fallback disabled',
    }
  }

  /**
   * Verify signature
   */
  async verifySignature(
    request: SignatureVerificationRequest
  ): Promise<SignatureVerificationResponse> {
    // Try EJBCA first
    if (this.ejbcaClient) {
      const status = await this.ejbcaClient.checkServiceStatus()
      if (status.available) {
        return await this.ejbcaClient.verifySignature(request)
      }

      // Service unavailable - queue if enabled
      if (this.config.fallbackQueueEnabled) {
        this.fallbackQueue.push({
          type: 'verify',
          request,
          timestamp: new Date(),
        })
        logger.warn('PKI service unavailable, verification queued', {
          signatureId: request.signatureId,
        })
      }
    }

    // Fallback: Manual verification (requires stored signature data)
    if (this.config.enableFallback) {
      logger.info('Using manual signature verification fallback', {
        signatureId: request.signatureId,
      })
      return {
        valid: false,
        verified: false,
        error: 'PKI service unavailable. Manual verification required.',
      }
    }

    return {
      valid: false,
      verified: false,
      error: 'PKI service unavailable and fallback disabled',
    }
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(
    request: CertificateRevocationRequest
  ): Promise<CertificateRevocationResponse> {
    if (this.ejbcaClient) {
      const status = await this.ejbcaClient.checkServiceStatus()
      if (status.available) {
        return await this.ejbcaClient.revokeCertificate(request)
      }
    }

    return {
      success: false,
      error: 'PKI service unavailable',
    }
  }

  /**
   * Process queued operations (when PKI becomes available)
   */
  async processQueue(): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    if (!this.ejbcaClient) {
      return {
        processed: 0,
        failed: 0,
        errors: ['No PKI client configured'],
      }
    }

    const status = await this.ejbcaClient.checkServiceStatus()
    if (!status.available) {
      return {
        processed: 0,
        failed: 0,
        errors: ['PKI service still unavailable'],
      }
    }

    const errors: string[] = []
    let processed = 0
    let failed = 0

    for (const item of this.fallbackQueue) {
      try {
        if (item.type === 'sign') {
          const result = await this.ejbcaClient.signDocument(
            item.request as DocumentSigningRequest
          )
          if (result.success) {
            processed++
          } else {
            failed++
            errors.push(result.error || 'Unknown error')
          }
        } else if (item.type === 'verify') {
          const result = await this.ejbcaClient.verifySignature(
            item.request as SignatureVerificationRequest
          )
          if (result.verified) {
            processed++
          } else {
            failed++
            errors.push(result.error || 'Unknown error')
          }
        } else if (item.type === 'enroll') {
          const result = await this.ejbcaClient.enrollCertificate(
            item.request as CertificateEnrollmentRequest
          )
          if (result.success) {
            processed++
          } else {
            failed++
            errors.push(result.error || 'Unknown error')
          }
        }
      } catch (error) {
        failed++
        errors.push(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    // Clear processed queue
    this.fallbackQueue = []

    logger.info('PKI queue processed', {
      processed,
      failed,
      totalErrors: errors.length,
    })

    return {
      processed,
      failed,
      errors,
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    count: number
    oldestItem?: Date
    newestItem?: Date
  } {
    if (this.fallbackQueue.length === 0) {
      return { count: 0 }
    }

    const timestamps = this.fallbackQueue.map((item) => item.timestamp)
    return {
      count: this.fallbackQueue.length,
      oldestItem: timestamps.reduce((a, b) => (a < b ? a : b)),
      newestItem: timestamps.reduce((a, b) => (a > b ? a : b)),
    }
  }
}

/**
 * Create PKI manager instance from environment variables
 */
export function createPKIManager(): PKIManager {
  const ejbcaUrl = process.env.EJBCA_BASE_URL
  const ejbcaUsername = process.env.EJBCA_USERNAME
  const ejbcaPassword = process.env.EJBCA_PASSWORD

  const config: PKIManagerConfig = {
    enableFallback: process.env.PKI_FALLBACK_ENABLED !== 'false',
    fallbackQueueEnabled: process.env.PKI_QUEUE_ENABLED !== 'false',
  }

  if (ejbcaUrl && ejbcaUsername && ejbcaPassword) {
    config.ejbca = {
      baseUrl: ejbcaUrl,
      username: ejbcaUsername,
      password: ejbcaPassword,
      timeout: parseInt(process.env.EJBCA_TIMEOUT || '30000', 10),
      retryAttempts: parseInt(process.env.EJBCA_RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.EJBCA_RETRY_DELAY || '1000', 10),
    }
  } else {
    logger.warn('EJBCA configuration incomplete, using fallback mode only', {
      hasUrl: !!ejbcaUrl,
      hasUsername: !!ejbcaUsername,
      hasPassword: !!ejbcaPassword,
    })
  }

  return new PKIManager(config)
}

