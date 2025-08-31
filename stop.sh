docker stop $(docker ps -a)
docker rm $(docker ps -a)
docker image prune
