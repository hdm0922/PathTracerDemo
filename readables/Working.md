# Working

현재 작업중인 기능입니다.

## ReSTIR Direct Illumination

일단은 Spatial Reuse Only로 Motion Vector 등의 복잡성을 제거

Compute Shader에서 모든 작업들 처리 (Multi-Pass)

### Pass 1 : Setup

Input : Storage Buffers

Output : G-Buffer

각 Thread는 자신이 담당하는 Pixel로 향하는 Camera Ray를 발사, First Hit Point의 모든 정보를 G-Buffer에 저장

### Pass 2 : Initial Sampling

Input : G-Buffer, LightBuffer

Output : ReservoirBuffer

각 Thread는 자신의 Pixel 위치의 G-Buffer로부터 Hit Point의 데이터를 읽고,

해당 위치에서 LightBuffer에 저장된 모든 광원 중 M개의 Light를 추출, 이들을 Reservoir에 넣으며 최종 Sample 결정


### Pass 3 : Spatial Reuse

Input : G-Buffer, ReservoirBuffer

Output : FinalReservoirBuffer

각 Thread는 자신의 Pixel과 이웃하는 수 개의 이웃 Pixel을 추출한다.

추출된 Pixel 들의 G-Buffer 데이터들을 현재 Pixel의 G-Buffer와 비교하며 유효한 Pixel들의 Reservoir만 따로 추출, 현재 Pixel의 Reservoir와 함께 RIS를 수행하여 최종 Sample 하나를 결정한다.

이 Sample을 FinalReservoirBuffer에 기록

### Pass 4 : Final Shading

Input : G-Buffer, FinalReservoirBuffer

Output : FrameTexture

각 Thread는 Pixel의 HitInfo를 G-Buffer로부터 꺼내고, 최종 광원을 FinalReservoirBuffer에서 꺼낸다.

이 하나의 광원이 주는 Light를 계산한 후, FinalReservoirBuffer의 UCW로 곱해 최종 Pixel 색을 결정한다.

Color = W_X * f(X)
