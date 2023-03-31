import { expect, test, beforeAll, afterAll, describe, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import { app } from '../src/app'
import request from 'supertest'

describe('Transaction routes', () => {

  // Espera o servidor subir para que os testes tenham um servidor para testar
  beforeAll(async () => {
    await app.ready()
  })

  // Fecha a aplicação após o término dos testes

  afterAll(async () => {
    await app.close()
  })

  // Deixa o banco de teste zerados, assim os teste E2E tem um banco limpo para seu teste.
  // Com isto a cada teste, o banco é apagado e após refeito as tabelas zeradas 

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  test('User can create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        tittle: 'New transaction',
        amount: 5000,
        type: 'credit'
      })
      .expect(201)
  })

  test('User can list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        tittle: 'New transaction',
        amount: 5000,
        type: 'credit'
      })

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionResponse.body.transactions[0].id  

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        tittle: 'New transaction',
        amount: 5000
      })
    )
  })

  test('User can get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        tittle: 'New transaction',
        amount: 5000,
        type: 'credit'
      })

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionResponse.body.transactions[0].id  

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)  

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        tittle: 'New transaction',
        amount: 5000
      })
    )
  })

  test('User can get a summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        tittle: 'Credit transaction',
        amount: 5000,
        type: 'credit'
      })

    const cookies = createTransactionResponse.get('Set-Cookie')

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        tittle: 'Debit transaction',
        amount: 2000,
        type: 'debit'
    })

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(summaryResponse.body.summary).toEqual({
      amount: 3000
    })
  }) 
  
})