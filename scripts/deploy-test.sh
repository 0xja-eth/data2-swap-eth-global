#!/bin/sh
name=$(head -n 1 app-name.txt)
region="ap-southeast-1"
port="3070"

SERVER_NAME="$name"

version=$(head -n 1 "$SERVER_NAME.version")
new_version=$((version + 1))

echo "=======================================> 当前版本号为: $version, 现在进行部署版本: $new_version"

i_name="$SERVER_NAME:$version"
c_name="$SERVER_NAME$version"

echo "=======================================> 当前版本号为: $version, 现在正在部署"

##容器id
CID=$(docker ps -a | grep "$c_name" | awk '{print $1}')

if [ -n "$CID" ]; then
  echo "=======================================> 存在容器 $c_name, CID-$CID"
  docker stop "$c_name"
  docker rm "$c_name"
  echo "=======================================> 删除容器成功"
fi

echo "=======================================> 开始部署到LightSail Container: IID-$i_name"
aws lightsail push-container-image \
  --region "$region" --service-name "$SERVER_NAME" --label "$name" --image "$i_name"

INAME=$(aws lightsail get-container-images \
  --region "$region" --service-name "$SERVER_NAME" --output text | awk 'NR==1{print $4}')

echo "=======================================> 开始创建LightSail Container Deployment: INAME-$INAME"

aws lightsail create-container-service-deployment \
  --region "$region" --service-name "$SERVER_NAME" \
  --containers "$name={image=$INAME,ports={$port=HTTP}}" \
  --public-endpoint "containerName=$name,containerPort=$port"

echo "=======================================> 版本部署成功"
