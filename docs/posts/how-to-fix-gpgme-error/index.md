# 修复 Archlinux 上出现的 GPGME Error


## Delete old sync files

```sh
sudo rm /var/lib/pacman/sync/*
```

## Re init pacman-key

```sh
sudo pacman-key --init
```

## Populate key

```sh
sudo pacman-key --populate
```

## Re sync

```sh
sudo pacman -Syyy
```

Now you can update successfully!

