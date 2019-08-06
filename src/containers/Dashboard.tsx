import { Grid, Typography, CircularProgress, Theme } from "@material-ui/core";
import useMultiGethStore from "../stores/useMultiGethStore";
import BigNumber from "bignumber.js";
import * as React from "react";
import { VictoryBar, VictoryChart, VictoryLine } from "victory";
import { hashesToGH, weiToGwei } from "../components/formatters";
import HashRate from "../components/HashRate";
import getBlocks, { useBlockNumber } from "../helpers";
import useInterval from "use-interval";
import { useTheme } from "@material-ui/styles";
import getTheme from "../themes/victoryTheme";
import ChartCard from "../components/ChartCard";
import BlockCardListContainer from "./BlockCardList";
import BlockListContainer from "./BlockList";

const useState = React.useState;

const config = {
  blockTime: 15, // seconds
  blockHistoryLength: 100,
  chartHeight: 200,
  chartWidth: 400,
};

const blockMapGasUsed = (block: any) => {
  return {
    x: parseInt(block.number, 16),
    y: new BigNumber(block.gasUsed).dividedBy(1000000),
  };
};

const blockMapUncles = (block: any) => {
  return {
    x: parseInt(block.number, 16),
    y: block.uncles.length,
  };
};

const blockMapHashRate = (block: any) => {
  return {
    x: parseInt(block.number, 16),
    y: hashesToGH(new BigNumber(block.difficulty, 16).dividedBy(config.blockTime)),
  };
};

const blockMapTransactionCount = (block: any) => {
  return {
    x: parseInt(block.number, 16),
    y: block.transactions.length,
  };
};

const getStyles = () => {
  return {
    topItems: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
  };
};

export default (props: any) => {
  const styles = getStyles();
  const [erpc] = useMultiGethStore();
  const theme = useTheme<Theme>();
  const victoryTheme = getTheme(theme);
  const [blockNumber] = useBlockNumber(erpc);
  const [chainId, setChainId] = useState();
  const [block, setBlock] = useState();
  const [blocks, setBlocks] = useState();
  const [gasPrice, setGasPrice] = useState();
  const [syncing, setSyncing] = useState();
  const [peerCount, setPeerCount] = useState();

  React.useEffect(() => {
    if (!erpc) { return; }
    erpc.eth_chainId().then(setChainId);
  }, [chainId, erpc]);

  React.useEffect(() => {
    if (!erpc || blockNumber === undefined) { return; }
    erpc.eth_getBlockByNumber(`0x${blockNumber.toString(16)}`, true).then(setBlock);
  }, [blockNumber, erpc]);

  React.useEffect(() => {
    if (!erpc || blockNumber === null) { return; }
    getBlocks(
      Math.max(blockNumber - config.blockHistoryLength + 1, 0),
      blockNumber,
      erpc,
    ).then((bl) => {
      setBlocks(bl);
    });
  }, [blockNumber, erpc]);

  useInterval(() => {
    if (!erpc) { return; }

    erpc.eth_syncing().then(setSyncing);
  }, 10000, true);

  React.useEffect(() => {
    if (!erpc) { return; }
    erpc.net_peerCount().then(setPeerCount);
  }, [erpc]);

  React.useEffect(() => {
    if (!erpc) { return; }
    erpc.eth_gasPrice().then(setGasPrice);
  }, [erpc]);

  if (!blocks) {
    return <CircularProgress />;
  }

  return (
    <div>
      <Grid container={true} spacing={3}>
        <Grid style={styles.topItems} item={true} xs={12}>
          <div key="blockHeight">
            <ChartCard title="Block Height">
              <Typography variant="h3">{blockNumber}</Typography>
            </ChartCard>
          </div>
          <div key="chainId">
            <ChartCard title="Chain ID">
              <Typography variant="h3">{parseInt(chainId, 16)}</Typography>
            </ChartCard>
          </div>
          <div key="syncing">
            <ChartCard title="Syncing">
              {typeof syncing === "object" && syncing.currentBlock &&
                <Typography variant="h3">
                  {parseInt(syncing.currentBlock, 16)} / {parseInt(syncing.highestBlock || "0x0", 16)}
                </Typography>
              }
              {!syncing && <Typography variant="h3">No</Typography>}
            </ChartCard>
          </div>
          <div key="gasPrice">
            <ChartCard title="Gas Price">
              <Typography variant="h3">{weiToGwei(parseInt(gasPrice, 16))} Gwei</Typography>
            </ChartCard>
          </div>
          <div key="hRate">
            <ChartCard title="Network Hash Rate">
              {block &&
                <HashRate block={block} blockTime={config.blockTime}>
                  {(hashRate: any) => <Typography variant="h3">{hashRate} GH/s</Typography>}
                </HashRate>
              }
            </ChartCard>
          </div>
          <div>
            <ChartCard title="Peers">
              <Typography variant="h3">{parseInt(peerCount, 16)}</Typography>
            </ChartCard>
          </div>
        </Grid>
        <Grid key="hashChart" item={true} xs={12} sm={6} lg={3}>
          <ChartCard title={`Hash Rate last ${blocks.length} blocks`}>
            <VictoryChart height={config.chartHeight} width={config.chartWidth} theme={victoryTheme as any}>
              <VictoryLine data={blocks.map(blockMapHashRate)} />
            </VictoryChart>
          </ChartCard>
        </Grid>
        <Grid key="txChart" item={true} xs={12} sm={6} lg={3}>
          <ChartCard title={`Transaction count last ${blocks.length} blocks`}>
            <VictoryChart height={config.chartHeight} width={config.chartWidth} theme={victoryTheme as any}>
              <VictoryBar data={blocks.map(blockMapTransactionCount)} />
            </VictoryChart>
          </ChartCard>
        </Grid>
        <Grid key="gasUsed" item={true} xs={12} sm={6} lg={3}>
          <ChartCard title={`Gas Used Last ${blocks.length} blocks`}>
            <VictoryChart height={config.chartHeight} width={config.chartWidth} theme={victoryTheme as any}>
              <VictoryBar data={blocks.map(blockMapGasUsed)} />
            </VictoryChart>
          </ChartCard>
        </Grid>
        <Grid key="uncles" item={true} xs={12} sm={6} lg={3}>
          <ChartCard title={`Uncles Last ${blocks.length} blocks`}>
            <VictoryChart height={config.chartHeight} width={config.chartWidth} theme={victoryTheme as any}>
              <VictoryBar data={blocks.map(blockMapUncles)} />
            </VictoryChart>
          </ChartCard>
        </Grid>

      </Grid>

      <BlockCardListContainer from={Math.max(blockNumber - 3, 0)} to={blockNumber} />
      <BlockListContainer from={Math.max((blockNumber - 3) - 11, 0)} to={blockNumber - 3} style={{marginTop: "30px"}} />

    </div>
  );
};
