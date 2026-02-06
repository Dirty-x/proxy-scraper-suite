import type { Agent } from '../types/agent.js';

// API Agents
import { geoNode } from './api/geoNode.js';
import { spysMeHttp, spysMeSocks } from './api/spysMe.js';
import { proxyScrapeHttp, proxyScrapeSocks4, proxyScrapeSocks5 } from './api/proxyScrape.js';
import { monosansHttp, monosansSocks4, monosansSocks5 } from './api/monosans.js';
import { theSpeedXHttp, theSpeedXSocks4, theSpeedXSocks5 } from './api/theSpeedX.js';
import { proxyListDownloadHttp, proxyListDownloadHttps, proxyListDownloadSocks4, proxyListDownloadSocks5 } from './api/proxyListDownload.js';
import { hidester } from './api/hidester.js';
import { proxyScanHttp, proxyScanHttps, proxyScanSocks4, proxyScanSocks5 } from './api/proxyScan.js';

// HTML Agents
import { usProxy, ukProxy, newProxy, socksProxy, anonymousProxy, sslProxies } from './html/freeProxyList.js';
import { hideMyName } from './html/hideMyName.js';
import { proxy11One, proxy11Two } from './html/proxy11.js';
import { openProxyHttp, openProxySocks4, openProxySocks5 } from './html/openProxy.js';
import { proxyNova } from './html/proxyNova.js';
import { vpnOverview } from './html/vpnOverview.js';
import { advancedName } from './html/advancedName.js';
import { freeProxyListCom } from './html/freeProxyListCom.js';
import { javaTPoint } from './html/javaTPoint.js';
import { proxyDaily } from './html/proxyDaily.js';
import { freeProxyWorld } from './html/freeProxyWorld.js';
import { anonymouse } from './html/anonymouse.js';
import { proxyListOrg } from './html/proxyListOrg.js';
import { freeProxyListCc } from './html/freeProxyListCc.js';
import { freeProxyCz } from './html/freeProxyCz.js';
import { freeProxyPro } from './html/freeProxyPro.js';
import { scrapingAnt } from './html/scrapingAnt.js';
import { vpnSide } from './html/vpnSide.js';
import { ipRoyal } from './html/ipRoyal.js';
import { searchAgent } from './html/searchAgent.js';

export const agents: Agent[] = [
    // API
    geoNode,
    spysMeHttp,
    spysMeSocks,
    proxyScrapeHttp,
    proxyScrapeSocks4,
    proxyScrapeSocks5,
    monosansHttp,
    monosansSocks4,
    monosansSocks5,
    theSpeedXHttp,
    theSpeedXSocks4,
    theSpeedXSocks5,
    proxyListDownloadHttp,
    proxyListDownloadHttps,
    proxyListDownloadSocks4,
    proxyListDownloadSocks5,
    hidester,
    proxyScanHttp,
    proxyScanHttps,
    proxyScanSocks4,
    proxyScanSocks5,

    // HTML
    ipRoyal,
    searchAgent,
    vpnSide,
    scrapingAnt,
    freeProxyPro,
    proxyListOrg,
    freeProxyListCc,
    anonymouse,
    freeProxyWorld,
    proxyDaily,
    javaTPoint,
    freeProxyListCom,
    advancedName,
    vpnOverview,
    proxyNova,
    proxy11One,
    proxy11Two,
    openProxyHttp,
    openProxySocks4,
    openProxySocks5,
    usProxy,
    ukProxy,
    newProxy,
    socksProxy,
    anonymousProxy,
    sslProxies,
    hideMyName,
    freeProxyCz,
];
