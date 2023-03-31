import { knex } from "../database"
import { FastifyInstance } from "fastify"
import { z } from 'zod'
import crypto from 'node:crypto'
import { checkSessionIdExists } from "../middlewares/check-session-id-exists"

// Cookies -> Forma de manter contextos entre requisições

export async function transactionsRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply ) => {

    const createTransactionBodySchema = z.object({
      tittle: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    // Validação do body da requisição

    const {tittle, amount, type } = createTransactionBodySchema.parse(request.body)

    // Se o parse der erro, irá retornar um throw new error, então o código que estiver abaixo desta linha nao irá ser executado.

    // Cookie

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = crypto.randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/', // todas rotas com acesso ao cookie
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days miliseconds
      })
    }

    await knex('transactions').insert({
      id: crypto.randomUUID(),
      tittle,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })    

    return reply.status(201).send('Transaction created')
  })

  app.get('/', {
    preHandler: [checkSessionIdExists] // middleware que verifica id de sessao
  }, async (request, reply) => {
    const { sessionId } = request.cookies

    const transactions = await knex('transactions')
      .where('session_id', sessionId)
      .select()
    
    return {
      transactions
    }
  })

  app.get('/:id', {
    preHandler: [checkSessionIdExists] // middleware que verifica id de sessao
  }, async (request) => {
    const getTransactionParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = getTransactionParamsSchema.parse(request.params) // validação

    const { sessionId } = request.cookies

    const transaction = await knex('transactions')
      .where({
        session_id: sessionId,
        id
      })
      .first()
    return { transaction }
  })

  app.get('/summary', {
    preHandler: [checkSessionIdExists] // middleware que verifica id de sessao
  }, async (request) => {
    const { sessionId } = request.cookies

    const summary = await knex('transactions')
      .where('session_id', sessionId)
      .sum('amount', { as: 'amount' })
      .first()

    return { summary }
  })
}