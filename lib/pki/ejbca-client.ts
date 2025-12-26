/**
 * EJBCA Client
 * Integration with EJBCA PKI system for digital signatures
 */

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
} from './types'
import { SystemError, ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { retry } from '@/lib/retry'
import { monitor } from '@/lib/monitoring'

/**
 * EJBCA client configuration
 */
export interface EJBCAClientConfig {
  baseUrl: string
  username: string
  password: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

/**
 * EJBCA API client
 */
export class EJBCAClient {
  private config: EJBCAClientConfig
  private serviceAvailable: boolean = true
  private lastStatusCheck?: Date

  constructor(config: EJBCAClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    }
  }

  /**
   * Check PKI service availability
   */
  async checkServiceStatus(): Promise<PKIServiceStatus> {
    return monitor('ejbca_status_check', async () => {
      try {
        const response = await fetch(`${this.config.baseUrl}/ejbca/ejbca-rest-api/v1/certificate/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
          },
          signal: AbortSignal.timeout(this.config.timeout!),
        })

        if (response.ok) {
          this.serviceAvailable = true
          this.lastStatusCheck = new Date()
          return {
            available: true,
            provider: 'ejbca',
            lastChecked: this.lastStatusCheck.toISOString(),
          }
        } else {
          this.serviceAvailable = false
          return {
            available: false,
            provider: 'ejbca',
            lastChecked: new Date().toISOString(),
            error: `EJBCA service returned status ${response.status}`,
          }
        }
      } catch (error) {
        this.serviceAvailable = false
        logger.error('EJBCA service status check failed', error as Error)
        return {
          available: false,
          provider: 'ejbca',
          lastChecked: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  }

  /**
   * Enroll certificate for user
   */
  async enrollCertificate(
    request: CertificateEnrollmentRequest
  ): Promise<CertificateEnrollmentResponse> {
    return monitor('ejbca_enroll_certificate', async () => {
      try {
        // Check service availability first
        const status = await this.checkServiceStatus()
        if (!status.available) {
          return {
            success: false,
            error: 'EJBCA service is unavailable',
          }
        }

        const response = await retry(
          async () => {
            const res = await fetch(
              `${this.config.baseUrl}/ejbca/ejbca-rest-api/v1/certificate/enroll`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
                },
                body: JSON.stringify({
                  username: request.userEmail,
                  password: 'temp-password', // Should be generated securely
                  certificate_profile_name: request.certificateProfile || 'ENDUSER',
                  end_entity_profile_name: request.endEntityProfile || 'APPROVAL',
                  certificate_authority_name: 'ManagementCA',
                  validity: request.validityPeriod || 365, // Days
                  subject_dn: `CN=${request.userName},O=${request.organization || 'Government of Zimbabwe'},OU=${request.role}`,
                }),
                signal: AbortSignal.timeout(this.config.timeout!),
              }
            )

            if (!res.ok) {
              const errorText = await res.text()
              throw new Error(`EJBCA enrollment failed: ${res.status} - ${errorText}`)
            }

            return res
          },
          {
            attempts: this.config.retryAttempts,
            delay: this.config.retryDelay,
            retryable: (error) => {
              // Retry on network errors or 5xx status codes
              return error instanceof TypeError || (error as Error).message.includes('500')
            },
          }
        )

        const data = await response.json()

        logger.info('Certificate enrolled successfully', {
          userId: request.userId,
          certificateId: data.certificate_id,
        })

        return {
          success: true,
          certificateId: data.certificate_id,
          certificateSerial: data.certificate_serial,
          certificateChain: data.certificate_chain,
          certificatePEM: data.certificate_pem,
        }
      } catch (error) {
        logger.error('Certificate enrollment failed', error as Error, {
          userId: request.userId,
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  }

  /**
   * Sign document
   */
  async signDocument(
    request: DocumentSigningRequest
  ): Promise<DocumentSigningResponse> {
    return monitor('ejbca_sign_document', async () => {
      try {
        // Check service availability
        const status = await this.checkServiceStatus()
        if (!status.available) {
          return {
            success: false,
            error: 'EJBCA service is unavailable',
          }
        }

        const response = await retry(
          async () => {
            const res = await fetch(
              `${this.config.baseUrl}/ejbca/ejbca-rest-api/v1/sign`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
                },
                body: JSON.stringify({
                  data: request.documentHash,
                  certificate_serial: request.certificateSerial,
                  signer_id: request.signerId,
                  signer_role: request.signerRole,
                  signer_name: request.signerName,
                  timestamp: request.timestamp || new Date().toISOString(),
                  metadata: request.metadata,
                }),
                signal: AbortSignal.timeout(this.config.timeout!),
              }
            )

            if (!res.ok) {
              const errorText = await res.text()
              throw new Error(`EJBCA signing failed: ${res.status} - ${errorText}`)
            }

            return res
          },
          {
            attempts: this.config.retryAttempts,
            delay: this.config.retryDelay,
            retryable: (error) => {
              return error instanceof TypeError || (error as Error).message.includes('500')
            },
          }
        )

        const data = await response.json()

        logger.info('Document signed successfully', {
          documentId: request.documentId,
          signatureId: data.signature_id,
          signerId: request.signerId,
        })

        return {
          success: true,
          signatureId: data.signature_id,
          signatureValue: data.signature_value,
          certificateSerial: data.certificate_serial,
          certificateChain: data.certificate_chain,
          timestamp: data.timestamp,
        }
      } catch (error) {
        logger.error('Document signing failed', error as Error, {
          documentId: request.documentId,
          signerId: request.signerId,
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  }

  /**
   * Verify signature
   */
  async verifySignature(
    request: SignatureVerificationRequest
  ): Promise<SignatureVerificationResponse> {
    return monitor('ejbca_verify_signature', async () => {
      try {
        // Check service availability
        const status = await this.checkServiceStatus()
        if (!status.available) {
          return {
            valid: false,
            verified: false,
            error: 'EJBCA service is unavailable',
          }
        }

        const response = await retry(
          async () => {
            const res = await fetch(
              `${this.config.baseUrl}/ejbca/ejbca-rest-api/v1/signature/verify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
                },
                body: JSON.stringify({
                  signature_id: request.signatureId,
                  document_hash: request.documentHash,
                  certificate_serial: request.certificateSerial,
                }),
                signal: AbortSignal.timeout(this.config.timeout!),
              }
            )

            if (!res.ok) {
              const errorText = await res.text()
              throw new Error(`EJBCA verification failed: ${res.status} - ${errorText}`)
            }

            return res
          },
          {
            attempts: this.config.retryAttempts,
            delay: this.config.retryDelay,
            retryable: (error) => {
              return error instanceof TypeError || (error as Error).message.includes('500')
            },
          }
        )

        const data = await response.json()

        return {
          valid: data.valid === true,
          verified: data.verified === true,
          certificateSerial: data.certificate_serial,
          signerName: data.signer_name,
          signerRole: data.signer_role,
          timestamp: data.timestamp,
          revocationStatus: data.revocation_status || 'unknown',
        }
      } catch (error) {
        logger.error('Signature verification failed', error as Error, {
          signatureId: request.signatureId,
        })
        return {
          valid: false,
          verified: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(
    request: CertificateRevocationRequest
  ): Promise<CertificateRevocationResponse> {
    return monitor('ejbca_revoke_certificate', async () => {
      try {
        const status = await this.checkServiceStatus()
        if (!status.available) {
          return {
            success: false,
            error: 'EJBCA service is unavailable',
          }
        }

        const response = await retry(
          async () => {
            const res = await fetch(
              `${this.config.baseUrl}/ejbca/ejbca-rest-api/v1/certificate/revoke`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
                },
                body: JSON.stringify({
                  certificate_serial: request.certificateSerial,
                  reason: request.revocationReason || 'unspecified',
                }),
                signal: AbortSignal.timeout(this.config.timeout!),
              }
            )

            if (!res.ok) {
              const errorText = await res.text()
              throw new Error(`EJBCA revocation failed: ${res.status} - ${errorText}`)
            }

            return res
          },
          {
            attempts: this.config.retryAttempts,
            delay: this.config.retryDelay,
            retryable: (error) => {
              return error instanceof TypeError || (error as Error).message.includes('500')
            },
          }
        )

        const data = await response.json()

        logger.info('Certificate revoked successfully', {
          certificateSerial: request.certificateSerial,
        })

        return {
          success: true,
          revokedAt: data.revoked_at,
        }
      } catch (error) {
        logger.error('Certificate revocation failed', error as Error, {
          certificateSerial: request.certificateSerial,
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.serviceAvailable
  }
}

