import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Box,
  useTranslation,
  Pools,
  AddLiquidityModal,
  Wallet,
  useMinichefStakingInfosHook,
  MinichefStakingInfo,
  useGetAllFarmDataHook,
  useGetMinichefStakingInfosViaSubgraphHook,
  DoubleSideStakingInfo,
  PoolType,
  useParsedQueryString
} from '@pangolindex/components'
import { PageWrapper, GridContainer, ExternalLink } from './styleds'
import { useStakingInfoHook } from 'src/state/stake/multiChainsHooks'
import Sidebar, { MenuType } from './Sidebar'
import { BIG_INT_ZERO } from 'src/constants'
import { Hidden } from 'src/theme'
import { useChainId } from 'src/hooks'
import { isEvmChain } from 'src/utils'

const PoolUI = () => {
  const chainId = useChainId()
  const [activeMenu, setMenu] = useState<string>(MenuType.allFarmV2)
  const [isAddLiquidityModalOpen, setAddLiquidityModalOpen] = useState<boolean>(false)
  const { t } = useTranslation()

  const parsedQs = useParsedQueryString()

  const currency0 = parsedQs?.currency0
  const currency1 = parsedQs?.currency1

  useEffect(() => {
    if (currency0 && currency1) {
      setAddLiquidityModalOpen(true)
    }
  }, [currency0, currency1])

  const useGetAllFarmData = useGetAllFarmDataHook[chainId]

  useGetAllFarmData()

  const subgraphMiniChefStakingInfo = useGetMinichefStakingInfosViaSubgraphHook[chainId]()
  const onChainMiniChefStakingInfo = useMinichefStakingInfosHook[chainId]()

  const handleAddLiquidityModalClose = useCallback(() => {
    setAddLiquidityModalOpen(false)
  }, [setAddLiquidityModalOpen])

  let stakingInfoV1 = useStakingInfoHook[chainId](1)
  // filter only live or needs migration pools
  stakingInfoV1 = useMemo(
    () =>
      (stakingInfoV1 || []).filter(
        (info: DoubleSideStakingInfo) => !info.isPeriodFinished || info.stakedAmount.greaterThan(BIG_INT_ZERO)
      ),
    [stakingInfoV1]
  )

  const ownStakingInfoV1 = useMemo(
    () =>
      (stakingInfoV1 || []).filter((stakingInfo: DoubleSideStakingInfo) => {
        return Boolean(stakingInfo.stakedAmount.greaterThan('0'))
      }),
    [stakingInfoV1]
  )

  // filter only live or needs migration pools
  const miniChefStakingInfo = useMemo(() => {
    if (subgraphMiniChefStakingInfo.length === 0 && onChainMiniChefStakingInfo.length > 0) {
      return onChainMiniChefStakingInfo.filter(
        (info: MinichefStakingInfo) => !info.isPeriodFinished || info.stakedAmount.greaterThan(BIG_INT_ZERO)
      ) as MinichefStakingInfo[]
    }
    return (subgraphMiniChefStakingInfo || []).filter(
      (info: MinichefStakingInfo) => !info.isPeriodFinished || info.stakedAmount.greaterThan(BIG_INT_ZERO)
    )
  }, [subgraphMiniChefStakingInfo, onChainMiniChefStakingInfo])

  const ownminiChefStakingInfo = useMemo(
    () =>
      (miniChefStakingInfo || []).filter((stakingInfo: MinichefStakingInfo) => {
        return Boolean(stakingInfo.stakedAmount.greaterThan('0'))
      }),
    [miniChefStakingInfo]
  )

  const superFarms = useMemo(
    () => miniChefStakingInfo.filter((item: MinichefStakingInfo) => (item?.rewardTokensAddress?.length || 0) > 1),
    [miniChefStakingInfo]
  )
  // here if farm is not avaialble your pool menu default active
  const minichefLength = (miniChefStakingInfo || []).length
  const stakingInfoV1Length = (miniChefStakingInfo || []).length
  useEffect(() => {
    if (minichefLength === 0 && stakingInfoV1Length === 0) {
      setMenu(MenuType.yourPool)
    } else {
      setMenu(MenuType.allFarmV2)
    }
  }, [minichefLength, stakingInfoV1Length])

  const menuItems: Array<{ label: string; value: string }> = []

  // add v1
  if (stakingInfoV1.length > 0) {
    menuItems.push({
      label: `${t('pool.allFarms')} (V1)`,
      value: MenuType.allFarmV1
    })
  }
  // add v2
  if (miniChefStakingInfo.length > 0) {
    menuItems.push({
      label: stakingInfoV1.length > 0 ? `${t('pool.allFarms')} (V2)` : `${t('pool.allFarms')}`,
      value: MenuType.allFarmV2
    })
  }
  // add own v1
  if (ownStakingInfoV1.length > 0) {
    menuItems.push({
      label: `${t('pool.yourFarms')} (V1)`,
      value: MenuType.yourFarmV1
    })
  }
  // add own v2
  if (ownminiChefStakingInfo.length > 0) {
    menuItems.push({
      label: ownStakingInfoV1.length > 0 ? `${t('pool.yourFarms')} (V2)` : `${t('pool.yourFarms')}`,
      value: MenuType.yourFarmV2
    })
  }
  // add superfarm
  if (superFarms.length > 0) {
    menuItems.push({
      label: 'Super Farms',
      value: MenuType.superFarm
    })
  }
  // TODO remove comment
  // if (menuItems.length > 0) {
  // add wallet
  menuItems.push({
    label: `${t('pool.yourPools')}`,
    value: MenuType.yourPool
  })
  //}

  const handleSetMenu = useCallback(
    (value: string) => {
      setMenu(value)
    },
    [setMenu]
  )

  return (
    <PageWrapper>
      <GridContainer>
        <Box display="flex" height="100%">
          <Sidebar
            activeMenu={activeMenu}
            setMenu={handleSetMenu}
            menuItems={menuItems}
            onManagePoolsClick={() => {
              setMenu(MenuType.yourPool)
            }}
          />

          {(activeMenu === MenuType.allFarmV1 ||
            activeMenu === MenuType.allFarmV2 ||
            activeMenu === MenuType.yourFarmV1 ||
            activeMenu === MenuType.yourFarmV2 ||
            activeMenu === MenuType.superFarm) &&
            isEvmChain(chainId) && (
              <Pools
                type={
                  activeMenu === MenuType.allFarmV1 || activeMenu === MenuType.allFarmV2
                    ? PoolType.all
                    : activeMenu === MenuType.superFarm
                    ? PoolType.superFarms
                    : PoolType.own
                }
                version={activeMenu === MenuType.allFarmV1 || activeMenu === MenuType.yourFarmV1 ? 1 : 2}
                stakingInfoV1={stakingInfoV1}
                miniChefStakingInfo={miniChefStakingInfo}
                activeMenu={activeMenu}
                setMenu={handleSetMenu}
                menuItems={menuItems}
              />
            )}
          {activeMenu === MenuType.yourPool && (
            <Wallet activeMenu={activeMenu} setMenu={handleSetMenu} menuItems={menuItems} />
          )}
        </Box>
        <Hidden upToSmall={true}>
          <Box>
            <ExternalLink onClick={() => setAddLiquidityModalOpen(true)} style={{ cursor: 'pointer' }}>
              {t('navigationTabs.createPair')}
            </ExternalLink>
          </Box>
        </Hidden>
      </GridContainer>
      <AddLiquidityModal isOpen={isAddLiquidityModalOpen} onClose={handleAddLiquidityModalClose} />
    </PageWrapper>
  )
}
export default PoolUI
