import React from 'react'
import styled from 'styled-components'
import { LineChart, Line } from 'recharts'
import { Box } from '@pangolindex/components'
import Logo from '../../../assets/svg/icon.svg'

export const Row = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    background: #1c1c1c;
    border-radius: 8px;
  }

  padding: 12px;
  border-bottom: 1px solid #282828;
`

export const TokenName = styled(Box)`
  display: flex;
  align-items: center;
  font-size: 20px;
  line-height: 30px;
  color: #e6e9ec;

  span {
    margin-left: 6px;
  }
`

export const TokenMiniChart = styled(Box)`
  width: 60%;
  display: flex;
  justify-content: center;
`

export const TokenValue = styled(Box)`
  text-align: right;
`

export const TokenPrice = styled(Box)`
  font-size: 16px;
  line-height: 24px;

  color: #e6e9ec;
`

export const TokenDiff = styled(Box)`
  font-size: 10px;
  line-height: 15px;
`

export interface TokenRowProps {
  name?: string
  diffPercent?: number
}

export default function TokenRow({ name = 'PNG', diffPercent = 1.68 }: TokenRowProps) {
  const data = []

  const rand = 300
  for (let i = 0; i < 20; i += 1) {
    const d = {
      key: 2000 + i,
      value: Math.random() * (rand + 50) + 100
    }

    data.push(d)
  }

  return (
    <Row>
      <TokenName>
        <img width={'28px'} src={Logo} alt={name} />
        <span>{name}</span>
      </TokenName>
      <TokenMiniChart>
        <LineChart width={82} height={18} data={data}>
          <Line type="monotone" dataKey="value" stroke="#16C79A" dot={false} />
        </LineChart>
      </TokenMiniChart>
      <TokenValue>
        <TokenPrice>${'122.74'}</TokenPrice>
        <TokenDiff>
          {diffPercent >= 0 ? '+' : '-'}
          {diffPercent}%
        </TokenDiff>
      </TokenValue>
    </Row>
  )
}
