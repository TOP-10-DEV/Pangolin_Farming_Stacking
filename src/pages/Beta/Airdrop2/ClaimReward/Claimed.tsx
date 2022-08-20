import React from 'react'
import { AVALANCHE_MAINNET, Chain } from '@pangolindex/sdk'
import { Button, Text } from '@pangolindex/components'
import { SmallSeparator, Wrapper, TextBottomWrapper } from '../styleds'
import { switchNetwork } from 'src/utils'
import Title from '../Title'

interface Props {
  chain: Chain
}

const AlreadyClaimed: React.FC<Props> = ({ chain }) => {
  return (
    <Wrapper>
      <Title chain={chain} title="You Already Claimed" />
      <Text fontSize={16} fontWeight={500} color="text1" textAlign="center">
        If you think there is a problem contact us via discord.
      </Text>
      <SmallSeparator />
      <Button variant="primary" color="black" height="46px" onClick={() => switchNetwork(AVALANCHE_MAINNET)}>
        GO BACK TO AVALANCHE
      </Button>
      <TextBottomWrapper>
        <Text fontSize={14} fontWeight={500} color="text8">
          Haven’t I seen you before?
        </Text>
      </TextBottomWrapper>
    </Wrapper>
  )
}

export default AlreadyClaimed
