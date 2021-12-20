import { Box, Button } from '@pangolindex/components'
import styled from 'styled-components'

export const Card = styled(Box)`
  width: 550px;
  padding: 20px 35px 30px;
  border-radius: 20px;
  background: ${({ theme }) => theme.bg2};
  margin-right: 22px;

  &:last-child {
    margin-right: 0px;
  }

  & img {
    border-radius: 100px;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    width: 100%;
    margin-bottom: 22px;
  `};
`

export const CardHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 30px;
`

export const CardColumn = styled(Box)<{ width?: string }>`
  width: ${props => (props.width ? props.width : '48%')};
`

export const CardStats = styled(Box)`
  display: flex;
  justify-content: space-between;
  padding: 19px 0;

  ${({ theme }) => theme.mediaWidth.upToLarge`
    flex-direction: column;
  `};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex-direction: row;
  `};
`

export const CardButtons = styled(Box)`
  display: flex;
  justify-content: space-between;
`

export const TokenName = styled(Box)`
  font-weight: 800;
  font-size: 28px;
  line-height: 33px;
  color: ${({ theme }) => theme.text10};
`

export const StakeButton = styled(Button)`
  background-color: ${({ theme }) => theme.bg8} !important;
  height: 46px;
  border-radius: 4px !important;
`

export const DetailButton = styled(Button)`
  border: solid 1px ${({ theme }) => theme.text1} !important;
  margin-left: 10px;
  height: 46px;
  border-radius: 4px !important;
`
