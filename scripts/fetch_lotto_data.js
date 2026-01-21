/**
 * 한국 로또 6/45 데이터 수집 스크립트
 * 동행복권 API에서 모든 회차 당첨번호를 가져와 JSON으로 저장
 */

const fs = require('fs');
const https = require('https');

const API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

// HTTP 요청을 Promise로 래핑
function fetchLottoRound(roundNo) {
    return new Promise((resolve, reject) => {
        const url = `${API_URL}${roundNo}`;

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    // 디버그: 첫 100자 확인
                    if (roundNo === 1) {
                        console.log('응답 샘플:', data.substring(0, 200));
                    }

                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    // 실패해도 null 반환 (계속 진행)
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            resolve(null);
        });
    });
}

// 딜레이 함수 (서버 부하 방지)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 모든 데이터 수집
async function fetchAllData() {
    console.log('🎱 한국 로또 6/45 데이터 수집 시작...\n');

    // 2026년 1월 기준 최신 회차는 약 1150회 정도
    // 안전하게 1회부터 시작해서 실패할 때까지 수집
    const allData = [];
    let consecutiveFails = 0;
    let round = 1;

    while (consecutiveFails < 5) {
        try {
            const result = await fetchLottoRound(round);

            if (result && result.returnValue === 'success') {
                consecutiveFails = 0;

                // 필요한 데이터만 추출
                const lottoData = {
                    round: result.drwNo,
                    date: result.drwNoDate,
                    numbers: [
                        result.drwtNo1,
                        result.drwtNo2,
                        result.drwtNo3,
                        result.drwtNo4,
                        result.drwtNo5,
                        result.drwtNo6
                    ],
                    bonus: result.bnusNo,
                    totalSales: result.totSellamnt,
                    firstPrize: result.firstWinamnt,
                    firstWinners: result.firstPrzwnerCo
                };

                allData.push(lottoData);

                // 진행 상황 출력 (50회마다)
                if (round % 50 === 0) {
                    console.log(`📊 진행: ${round}회 수집 완료`);
                }
            } else if (result && result.returnValue === 'fail') {
                consecutiveFails++;
                console.log(`⚠️ ${round}회: 데이터 없음 (${consecutiveFails}/5)`);
            } else {
                consecutiveFails++;
                console.log(`⚠️ ${round}회: 요청 실패 (${consecutiveFails}/5)`);
            }

            round++;

            // 서버 부하 방지를 위한 딜레이
            await delay(100);

        } catch (error) {
            consecutiveFails++;
            console.error(`❌ ${round}회 오류:`, error.message);
            round++;
        }
    }

    const latestRound = round - 6; // 마지막 성공 회차

    console.log(`\n✅ 데이터 수집 완료! 총 ${allData.length}회차\n`);

    // JSON 파일로 저장
    const output = {
        meta: {
            source: 'dhlottery.co.kr',
            fetchedAt: new Date().toISOString(),
            totalRounds: allData.length,
            latestRound: latestRound
        },
        data: allData
    };

    const path = require('path');
    const outputPath = path.join(__dirname, '..', 'lotto_data.json');

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`💾 저장 완료: ${outputPath}`);

    // 통계 요약
    if (allData.length > 0) {
        console.log('\n📈 기본 통계:');
        console.log(`   - 첫 회차: ${allData[0].date} (${allData[0].round}회)`);
        console.log(`   - 최신 회차: ${allData[allData.length - 1].date} (${allData[allData.length - 1].round}회)`);
        console.log(`   - 첫 번호 예시: ${allData[0].numbers.join(', ')} + ${allData[0].bonus}`);
    }
}

// 실행
fetchAllData().catch(console.error);
