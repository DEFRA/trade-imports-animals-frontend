import { describe, expect, test, vi, beforeEach } from 'vitest'
import { viewOperatorController } from './controller.js'
import { operatorsClient } from '../../common/clients/operators-client.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn().mockReturnValue('test-trace-id')
}))

function mockToolkit() {
  const response = {
    code(statusCode) {
      this.statusCode = statusCode
      return this
    }
  }
  return {
    view: vi.fn((template, data) =>
      Object.assign({ template, data }, response)
    ),
    redirect: vi.fn((location) => ({ location }))
  }
}

function viewRequest(operatorId) {
  return {
    params: { operatorId },
    auth: {
      credentials: { profile: { crn: 'CRN123', organisationId: 'ORG1' } }
    }
  }
}

const apiConsignor = {
  id: 'op-1',
  operator_type: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  address_line_1: '12 Dock Road',
  address_line_2: '',
  town: 'Hull',
  county: '',
  postcode: 'HU1 1AA',
  country: 'Finland',
  telephone: '01234 567890',
  email: 'ops@tampere.example'
}

const apiTransporter = {
  id: 'op-2',
  operator_type: 'TRANSPORTER',
  name: 'Nordic Livestock Movers',
  address_line_1: '5 Harbour View',
  town: 'Grimsby',
  postcode: 'DN31 1AA',
  country: 'Finland',
  telephone: '01111 222333',
  email: 'ops@nordic.example',
  approval_number: 'AP-2024-001',
  transporter_category: 'COMMERCIAL'
}

function rowsByKey(response) {
  return Object.fromEntries(
    response.data.rows.map((row) => [row.key, row.value])
  )
}

describe('viewOperatorController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders the operator fields and both an Edit and a Delete option', async () => {
    operatorsClient.getOperator.mockResolvedValue(apiConsignor)
    const h = mockToolkit()

    const response = await viewOperatorController.get.handler(
      viewRequest('op-1'),
      h
    )

    expect(operatorsClient.getOperator).toHaveBeenCalledWith(
      'test-trace-id',
      { crn: 'CRN123', organisationId: 'ORG1' },
      'op-1'
    )
    const rows = rowsByKey(response)
    expect(rows.Name).toBe('Tampere Horse Transport')
    expect(rows.Type).toBe('Consignor')
    expect(rows.Country).toBe('Finland')
    expect(rows.Telephone).toBe('01234 567890')
    expect(rows['Email address']).toBe('ops@tampere.example')
    expect(response.data.editHref).toBe('/address-book/op-1/edit')
    expect(response.data.deleteHref).toBe('/address-book/op-1/delete')
  })

  test('a TRANSPORTER also shows the approval number and transporter category', async () => {
    operatorsClient.getOperator.mockResolvedValue(apiTransporter)
    const h = mockToolkit()

    const response = await viewOperatorController.get.handler(
      viewRequest('op-2'),
      h
    )

    const rows = rowsByKey(response)
    expect(rows['Approval number']).toBe('AP-2024-001')
    expect(rows['Transporter category']).toBe('Commercial')
  })

  test('does not add the transporter rows for a non-transporter operator', async () => {
    operatorsClient.getOperator.mockResolvedValue(apiConsignor)
    const h = mockToolkit()

    const response = await viewOperatorController.get.handler(
      viewRequest('op-1'),
      h
    )

    const rows = rowsByKey(response)
    expect(rows['Approval number']).toBeUndefined()
    expect(rows['Transporter category']).toBeUndefined()
  })

  test('an unknown or other-user id (client 404) renders the not-found page', async () => {
    const notFound = new Error('Failed to get operator')
    notFound.status = 404
    operatorsClient.getOperator.mockRejectedValue(notFound)
    const h = mockToolkit()

    const response = await viewOperatorController.get.handler(
      viewRequest('missing'),
      h
    )

    expect(response.template).toBe('error/index')
    expect(response.statusCode).toBe(404)
  })

  test('propagates a non-404 client failure to the standard error page', async () => {
    const boom = new Error('Failed to get operator')
    boom.status = 500
    operatorsClient.getOperator.mockRejectedValue(boom)
    const h = mockToolkit()

    await expect(
      viewOperatorController.get.handler(viewRequest('op-1'), h)
    ).rejects.toThrow('Failed to get operator')
  })
})
