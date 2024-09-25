import { StatusCodes } from 'http-status-codes'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../src/app'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('pnpm knex migrate:rollback --all')
    execSync('pnpm knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({ title: 'New transaction', amount: 5000, type: 'credit' })
      .expect(StatusCodes.CREATED)
  })

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({ title: 'New transaction', amount: 5000, type: 'credit' })

    const cookies = createTransactionResponse.get('Set-Cookie') ?? []

    const lisTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(StatusCodes.OK)

    expect(lisTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    ])
  })

  it('should be able to get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({ title: 'New transaction', amount: 5000, type: 'credit' })

    const cookies = createTransactionResponse.get('Set-Cookie') ?? []

    const lisTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)

    const transactionId = lisTransactionsResponse.body.transactions[0].id

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(StatusCodes.OK)

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    )
  })

  it('should be able to get the summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({ title: 'Credit transaction', amount: 5000, type: 'credit' })

    const cookies = createTransactionResponse.get('Set-Cookie') ?? []

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({ title: 'Debit transaction', amount: 2156, type: 'debit' })

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(StatusCodes.OK)

    expect(summaryResponse.body.summary).toEqual({
      amount: 5000 - 2156,
    })
  })
})
